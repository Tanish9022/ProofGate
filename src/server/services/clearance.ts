import { db } from '@/server/db/client';

export interface ReviewQueueItem {
  versionId: string;
  contentId: string;
  contentTitle: string;
  version: number;
  text: string;
  state: string;
  submittedAt: string;
  blockerCount: number;
  warningCount: number;
  findingsCount: number;
  unresolvedBlockers: number;
}

export interface ClearanceDependencyDetail {
  id: string;
  source_id: string;
  source_title: string;
  source_key: string;
  source_version: number;
  source_value: Record<string, unknown>;
  quote: string | null;
  link_status: 'confirmed' | 'probable';
}

export interface ClearanceRecord {
  id: string;
  content_version_id: string;
  content_id: string;
  content_title: string;
  version: number;
  decision: 'approved' | 'rejected';
  state: 'current' | 'revalidation_required' | 'review_needed' | 'rejected';
  reviewer: string;
  comment: string | null;
  decided_at: string;
  file_hash: string;
  text: string;
  dependencies: ClearanceDependencyDetail[];
}

export interface ClearanceSummary {
  id: string;
  content_id: string;
  content_title: string;
  version: number;
  decision: 'approved' | 'rejected';
  state: 'current' | 'revalidation_required' | 'review_needed' | 'rejected';
  reviewer: string;
  decided_at: string;
  dependency_count: number;
}

/**
 * Submit content version for review.
 * Blocked if any finding with severity 'blocker' is unresolved (neither accepted, edited-clean, nor dismissed with reason).
 */
export async function submitForReview(
  workspaceId: string,
  contentId: string,
  versionId: string,
  actor: string = 'creator'
): Promise<{ success: boolean; versionId: string }> {
  // 1. Verify content version exists in workspace
  const verRows = await db<{ id: string; version: number }>(
    `SELECT id, version FROM content_versions
     WHERE id = $1 AND content_id = $2 AND workspace_id = $3`,
    [versionId, contentId, workspaceId]
  );
  if (verRows.length === 0) {
    throw new Error('Content version not found in this workspace.');
  }

  // 2. Check for unresolved blockers
  const unresolvedBlockers = await db<{ id: string; quote: string; explanation: string }>(
    `SELECT id, quote, explanation FROM findings
     WHERE content_version_id = $1 AND workspace_id = $2
       AND severity = 'blocker'
       AND (creator_action IS NULL OR (creator_action = 'dismissed' AND (dismiss_reason IS NULL OR TRIM(dismiss_reason) = '')))`,
    [versionId, workspaceId]
  );

  if (unresolvedBlockers.length > 0) {
    throw new Error(
      `Cannot submit for review: ${unresolvedBlockers.length} unresolved blocker finding(s) remain. Fix them or dismiss with a reason.`
    );
  }

  // 3. Update state to in_review
  await db(
    `UPDATE content_versions SET state = 'in_review' WHERE id = $1 AND workspace_id = $2`,
    [versionId, workspaceId]
  );

  // 4. Audit log
  await db(
    `INSERT INTO audit_log (workspace_id, actor_role, action, entity_type, entity_id, details)
     VALUES ($1, $2, 'content.submitted_for_review', 'content_version', $3, $4)`,
    [
      workspaceId,
      actor,
      versionId,
      JSON.stringify({ contentId, version: verRows[0].version }),
    ]
  );

  return { success: true, versionId };
}

/**
 * Get all content versions waiting in the review queue (state = 'in_review')
 */
export async function getReviewQueue(workspaceId: string): Promise<ReviewQueueItem[]> {
  interface RawQueueRow {
    version_id: string;
    content_id: string;
    content_title: string;
    version: number;
    text: string;
    state: string;
    created_at: string;
    blocker_count: number;
    warning_count: number;
    findings_count: number;
    unresolved_blockers: number;
  }

  const query = `
    SELECT
      cv.id AS version_id,
      c.id AS content_id,
      c.title AS content_title,
      cv.version,
      cv.text,
      cv.state,
      cv.created_at,
      (SELECT COUNT(*)::int FROM findings f WHERE f.content_version_id = cv.id AND f.severity = 'blocker') AS blocker_count,
      (SELECT COUNT(*)::int FROM findings f WHERE f.content_version_id = cv.id AND f.severity = 'warning') AS warning_count,
      (SELECT COUNT(*)::int FROM findings f WHERE f.content_version_id = cv.id) AS findings_count,
      (SELECT COUNT(*)::int FROM findings f
       WHERE f.content_version_id = cv.id
         AND f.severity = 'blocker'
         AND (f.creator_action IS NULL OR f.creator_action != 'dismissed')
      ) AS unresolved_blockers
    FROM content_versions cv
    JOIN contents c ON c.id = cv.content_id
    WHERE cv.workspace_id = $1 AND cv.state = 'in_review'
    ORDER BY cv.created_at ASC
  `;

  const rows = await db<RawQueueRow>(query, [workspaceId]);

  return rows.map(r => ({
    versionId: r.version_id,
    contentId: r.content_id,
    contentTitle: r.content_title,
    version: r.version,
    text: r.text,
    state: r.state,
    submittedAt: r.created_at,
    blockerCount: r.blocker_count,
    warningCount: r.warning_count,
    findingsCount: r.findings_count,
    unresolvedBlockers: r.unresolved_blockers,
  }));
}

/**
 * Reviewer decision: approve or reject.
 * Approval creates a clearance and stores every source version it depended on.
 */
export async function decideReview(
  workspaceId: string,
  versionId: string,
  decision: 'approved' | 'rejected',
  comment: string,
  reviewer: string = 'reviewer'
): Promise<{ clearanceId: string; state: string }> {
  if (decision === 'rejected' && (!comment || !comment.trim())) {
    throw new Error('A comment explaining the rejection is required.');
  }

  // 1. Get version and content info
  const verRows = await db<{
    id: string;
    content_id: string;
    version: number;
    title: string;
    file_hash: string;
  }>(
    `SELECT cv.id, cv.content_id, cv.version, c.title, cv.file_hash
     FROM content_versions cv
     JOIN contents c ON c.id = cv.content_id
     WHERE cv.id = $1 AND cv.workspace_id = $2`,
    [versionId, workspaceId]
  );
  if (verRows.length === 0) {
    throw new Error('Content version not found.');
  }
  const ver = verRows[0];

  const newState = decision === 'approved' ? 'current' : 'rejected';

  // 2. Insert into clearances
  const clearanceRows = await db<{ id: string }>(
    `INSERT INTO clearances (
       workspace_id, content_version_id, decision, state, reviewer, comment
     ) VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [workspaceId, versionId, decision, newState, reviewer, comment ? comment.trim() : null]
  );
  const clearanceId = clearanceRows[0].id;

  // 3. Update content_version state
  const contentState = decision === 'approved' ? 'cleared' : 'rejected';
  await db(
    `UPDATE content_versions SET state = $1 WHERE id = $2 AND workspace_id = $3`,
    [contentState, versionId, workspaceId]
  );

  // 4. If approved: trace and lock dependencies in clearance_dependencies
  if (decision === 'approved') {
    // Find all findings with link_status = 'confirmed' AND a valid source_version_id
    interface FindingDep {
      claim_id: string | null;
      source_version_id: string;
      link_status: 'confirmed' | 'probable';
    }

    const findingDeps = await db<FindingDep>(
      `SELECT claim_id, source_version_id, link_status
       FROM findings
       WHERE content_version_id = $1
         AND workspace_id = $2
         AND source_version_id IS NOT NULL
         AND link_status = 'confirmed'
         AND status = 'supported'`,
      [versionId, workspaceId]
    );

    // Also include confirmed term rule versions used in this content version
    const termDeps = await db<FindingDep>(
      `SELECT NULL as claim_id, source_version_id, link_status
       FROM findings
       WHERE content_version_id = $1
         AND workspace_id = $2
         AND source_version_id IS NOT NULL
         AND kind = 'term'`,
      [versionId, workspaceId]
    );

    // Deduplicate dependencies by source_version_id
    const seenSources = new Set<string>();
    const allDeps = [...findingDeps, ...termDeps];

    for (const d of allDeps) {
      if (!seenSources.has(d.source_version_id)) {
        seenSources.add(d.source_version_id);
        await db(
          `INSERT INTO clearance_dependencies (
             clearance_id, workspace_id, source_version_id, claim_id, link_status
           ) VALUES ($1, $2, $3, $4, 'confirmed')`,
          [clearanceId, workspaceId, d.source_version_id, d.claim_id]
        );
      }
    }
  }

  // 5. Audit log
  await db(
    `INSERT INTO audit_log (workspace_id, actor_role, action, entity_type, entity_id, details)
     VALUES ($1, $2, $3, 'clearance', $4, $5)`,
    [
      workspaceId,
      reviewer,
      decision === 'approved' ? 'clearance.approved' : 'clearance.rejected',
      clearanceId,
      JSON.stringify({
        contentId: ver.content_id,
        contentTitle: ver.title,
        version: ver.version,
        decision,
        comment,
      }),
    ]
  );

  return { clearanceId, state: newState };
}

/**
 * List all clearances in the workspace
 */
export async function getClearances(workspaceId: string): Promise<ClearanceSummary[]> {
  interface RawClearanceRow {
    id: string;
    content_id: string;
    content_title: string;
    version: number;
    decision: 'approved' | 'rejected';
    state: 'current' | 'revalidation_required' | 'review_needed' | 'rejected';
    reviewer: string;
    decided_at: string;
    dep_count: number;
  }

  const query = `
    SELECT
      cl.id,
      c.id AS content_id,
      c.title AS content_title,
      cv.version,
      cl.decision,
      cl.state,
      cl.reviewer,
      cl.decided_at,
      (SELECT COUNT(*)::int FROM clearance_dependencies cd WHERE cd.clearance_id = cl.id) AS dep_count
    FROM clearances cl
    JOIN content_versions cv ON cv.id = cl.content_version_id
    JOIN contents c ON c.id = cv.content_id
    WHERE cl.workspace_id = $1
    ORDER BY cl.decided_at DESC
  `;

  const rows = await db<RawClearanceRow>(query, [workspaceId]);

  return rows.map(r => ({
    id: r.id,
    content_id: r.content_id,
    content_title: r.content_title,
    version: r.version,
    decision: r.decision,
    state: r.state,
    reviewer: r.reviewer,
    decided_at: r.decided_at,
    dependency_count: r.dep_count,
  }));
}

/**
 * Get full clearance record by ID with locked dependencies and timeline
 */
export async function getClearanceById(
  workspaceId: string,
  clearanceId: string
): Promise<ClearanceRecord | null> {
  const clRows = await db<{
    id: string;
    content_version_id: string;
    content_id: string;
    content_title: string;
    version: number;
    decision: 'approved' | 'rejected';
    state: 'current' | 'revalidation_required' | 'review_needed' | 'rejected';
    reviewer: string;
    comment: string | null;
    decided_at: string;
    file_hash: string;
    text: string;
  }>(
    `SELECT
       cl.id,
       cl.content_version_id,
       c.id AS content_id,
       c.title AS content_title,
       cv.version,
       cl.decision,
       cl.state,
       cl.reviewer,
       cl.comment,
       cl.decided_at,
       cv.file_hash,
       cv.text
     FROM clearances cl
     JOIN content_versions cv ON cv.id = cl.content_version_id
     JOIN contents c ON c.id = cv.content_id
     WHERE cl.id = $1 AND cl.workspace_id = $2`,
    [clearanceId, workspaceId]
  );

  if (clRows.length === 0) return null;
  const cl = clRows[0];

  interface RawDepRow {
    id: string;
    source_id: string;
    source_title: string;
    source_key: string;
    source_version: number;
    source_value: Record<string, unknown>;
    quote: string | null;
    link_status: 'confirmed' | 'probable';
  }

  const depQuery = `
    SELECT
      cd.id,
      s.id AS source_id,
      s.title AS source_title,
      s.key AS source_key,
      sv.version AS source_version,
      sv.value AS source_value,
      clm.quote,
      cd.link_status
    FROM clearance_dependencies cd
    JOIN source_versions sv ON sv.id = cd.source_version_id
    JOIN sources s ON s.id = sv.source_id
    LEFT JOIN claims clm ON clm.id = cd.claim_id
    WHERE cd.clearance_id = $1 AND cd.workspace_id = $2
    ORDER BY s.title ASC
  `;

  const dependencies = await db<RawDepRow>(depQuery, [clearanceId, workspaceId]);

  return {
    ...cl,
    dependencies,
  };
}

