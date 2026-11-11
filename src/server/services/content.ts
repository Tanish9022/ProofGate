import crypto from 'crypto';
import { db } from '@/server/db/client';
import { extractClaims } from '@/server/ai/gemini';
import { runDeterministicChecks, SourceLookup, ComputedFinding } from '@/server/checker/checker';

export interface ContentSummary {
  id: string;
  title: string;
  created_by: string;
  created_at: string;
  latestVersion: {
    id: string;
    version: number;
    state: string;
    file_name: string | null;
    file_type: string | null;
    created_at: string;
    blockerCount: number;
    warningCount: number;
    unresolvedBlockers: number;
  };
}

export interface ContentVersionDetail {
  id: string;
  content_id: string;
  version: number;
  text: string;
  file_name: string | null;
  file_type: string | null;
  file_hash: string;
  state: string;
  ai_available: boolean;
  created_at: string;
}

export interface FindingRow {
  id: string;
  content_version_id: string;
  claim_id: string | null;
  kind: 'claim' | 'term' | 'guideline' | 'injection' | 'asset';
  status: 'supported' | 'contradicted' | 'expired_or_superseded' | 'unverifiable' | 'conflicting_evidence' | 'review_needed';
  severity: 'info' | 'warning' | 'blocker';
  source_version_id: string | null;
  source_title?: string | null;
  source_version?: number | null;
  source_display?: string | null;
  quote: string;
  start_idx: number;
  end_idx: number;
  explanation: string;
  suggested_fix: string | null;
  creator_action: 'accepted' | 'edited' | 'dismissed' | null;
  dismiss_reason: string | null;
  link_status: 'confirmed' | 'probable' | null;
}

export interface ContentDetail {
  id: string;
  title: string;
  created_by: string;
  created_at: string;
  versions: ContentVersionDetail[];
  activeVersion: ContentVersionDetail;
  claims: Array<{
    id: string;
    quote: string;
    start_idx: number;
    end_idx: number;
    fact_key: string | null;
    value: Record<string, unknown> | null;
    context: string;
  }>;
  findings: FindingRow[];
}

/**
 * Check rate limit for analysis (20 requests per workspace per hour)
 */
async function checkAnalysisRateLimit(workspaceId: string): Promise<void> {
  const limit = parseInt(process.env.RATE_LIMIT_ANALYZE_PER_HOUR || '20', 10);
  const hourAgo = new Date(Date.now() - 3600000).toISOString();

  const countRows = await db<{ count: string }>(
    `SELECT COUNT(*)::text as count
     FROM rate_limit_log
     WHERE workspace_id = $1 AND action = 'analyze' AND created_at >= $2`,
    [workspaceId, hourAgo]
  );
  const count = parseInt(countRows[0]?.count || '0', 10);
  if (count >= limit) {
    throw new Error(`Rate limit exceeded: maximum ${limit} analysis checks per workspace per hour.`);
  }

  await db(
    `INSERT INTO rate_limit_log (workspace_id, action) VALUES ($1, 'analyze')`,
    [workspaceId]
  );
}

/**
 * Create a new content piece and its initial version 1
 */
export async function createContent(
  workspaceId: string,
  data: {
    title: string;
    text: string;
    fileName?: string | null;
    fileType?: string | null;
    fileHash?: string | null;
  },
  actor: string = 'creator'
): Promise<{ contentId: string; versionId: string }> {
  const contentRows = await db<{ id: string }>(
    `INSERT INTO contents (workspace_id, title, created_by)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [workspaceId, data.title, actor]
  );
  const contentId = contentRows[0].id;

  const hash =
    data.fileHash ||
    crypto.createHash('sha256').update(Buffer.from(data.text, 'utf-8')).digest('hex');

  const verRows = await db<{ id: string }>(
    `INSERT INTO content_versions (
       content_id, workspace_id, version, text, file_name, file_type, file_hash, state, ai_available
     ) VALUES ($1, $2, 1, $3, $4, $5, $6, 'draft', true)
     RETURNING id`,
    [contentId, workspaceId, data.text, data.fileName || null, data.fileType || null, hash]
  );
  const versionId = verRows[0].id;

  await db(
    `INSERT INTO audit_log (workspace_id, actor_role, action, entity_type, entity_id, details)
     VALUES ($1, $2, 'content.submitted', 'content', $3, $4)`,
    [
      workspaceId,
      actor,
      contentId,
      JSON.stringify({ title: data.title, versionId, version: 1 }),
    ]
  );

  return { contentId, versionId };
}

/**
 * Create a new content version (e.g. after creator fixes findings)
 */
export async function createContentVersion(
  workspaceId: string,
  contentId: string,
  text: string,
  actor: string = 'creator'
): Promise<{ versionId: string; versionNumber: number }> {
  const latestRows = await db<{ version: number }>(
    `SELECT version FROM content_versions
     WHERE content_id = $1 AND workspace_id = $2
     ORDER BY version DESC LIMIT 1`,
    [contentId, workspaceId]
  );

  const nextVer = (latestRows[0]?.version ?? 0) + 1;
  const hash = crypto.createHash('sha256').update(Buffer.from(text, 'utf-8')).digest('hex');

  const verRows = await db<{ id: string }>(
    `INSERT INTO content_versions (
       content_id, workspace_id, version, text, file_hash, state, ai_available
     ) VALUES ($1, $2, $3, $4, $5, 'draft', true)
     RETURNING id`,
    [contentId, workspaceId, nextVer, text, hash]
  );

  await db(
    `INSERT INTO audit_log (workspace_id, actor_role, action, entity_type, entity_id, details)
     VALUES ($1, $2, 'content.version_created', 'content_version', $3, $4)`,
    [
      workspaceId,
      actor,
      verRows[0].id,
      JSON.stringify({ contentId, version: nextVer }),
    ]
  );

  return { versionId: verRows[0].id, versionNumber: nextVer };
}

/**
 * List all content items in a workspace with their latest version summary
 */
export async function listContents(workspaceId: string): Promise<ContentSummary[]> {
  interface RawContentRow {
    id: string;
    title: string;
    created_by: string;
    created_at: string;
    ver_id: string;
    version: number;
    state: string;
    file_name: string | null;
    file_type: string | null;
    ver_created_at: string;
    blocker_count: number;
    warning_count: number;
    unresolved_blockers: number;
  }

  const query = `
    SELECT
      c.id,
      c.title,
      c.created_by,
      c.created_at,
      cv.id AS ver_id,
      cv.version,
      cv.state,
      cv.file_name,
      cv.file_type,
      cv.created_at AS ver_created_at,
      (SELECT COUNT(*)::int FROM findings f WHERE f.content_version_id = cv.id AND f.severity = 'blocker') AS blocker_count,
      (SELECT COUNT(*)::int FROM findings f WHERE f.content_version_id = cv.id AND f.severity = 'warning') AS warning_count,
      (SELECT COUNT(*)::int FROM findings f
       WHERE f.content_version_id = cv.id
         AND f.severity = 'blocker'
         AND (f.creator_action IS NULL OR f.creator_action = 'edited')
      ) AS unresolved_blockers
    FROM contents c
    JOIN content_versions cv ON cv.content_id = c.id
    WHERE c.workspace_id = $1
      AND cv.version = (
        SELECT MAX(cv2.version)
        FROM content_versions cv2
        WHERE cv2.content_id = c.id
      )
    ORDER BY c.created_at DESC
  `;

  const rows = await db<RawContentRow>(query, [workspaceId]);

  return rows.map(r => ({
    id: r.id,
    title: r.title,
    created_by: r.created_by,
    created_at: r.created_at,
    latestVersion: {
      id: r.ver_id,
      version: r.version,
      state: r.state,
      file_name: r.file_name,
      file_type: r.file_type,
      created_at: r.ver_created_at,
      blockerCount: r.blocker_count,
      warningCount: r.warning_count,
      unresolvedBlockers: r.unresolved_blockers,
    },
  }));
}

/**
 * Fetch full content details, version history, claims, and findings
 */
export async function getContent(
  workspaceId: string,
  contentId: string,
  targetVersionNumber?: number
): Promise<ContentDetail | null> {
  const contentRows = await db<{
    id: string;
    title: string;
    created_by: string;
    created_at: string;
  }>(
    `SELECT id, title, created_by, created_at FROM contents WHERE id = $1 AND workspace_id = $2`,
    [contentId, workspaceId]
  );

  if (contentRows.length === 0) return null;
  const content = contentRows[0];

  const versionRows = await db<ContentVersionDetail>(
    `SELECT id, content_id, version, text, file_name, file_type, file_hash, state, ai_available, created_at
     FROM content_versions
     WHERE content_id = $1 AND workspace_id = $2
     ORDER BY version DESC`,
    [contentId, workspaceId]
  );

  if (versionRows.length === 0) return null;

  const activeVer =
    (targetVersionNumber
      ? versionRows.find(v => v.version === targetVersionNumber)
      : versionRows[0]) || versionRows[0];

  const claims = await db<{
    id: string;
    quote: string;
    start_idx: number;
    end_idx: number;
    fact_key: string | null;
    value: Record<string, unknown> | null;
    context: string;
  }>(
    `SELECT id, quote, start_idx, end_idx, fact_key, value, context
     FROM claims
     WHERE content_version_id = $1 AND workspace_id = $2
     ORDER BY start_idx ASC`,
    [activeVer.id, workspaceId]
  );

  interface RawFinding {
    id: string;
    content_version_id: string;
    claim_id: string | null;
    kind: 'claim' | 'term' | 'guideline' | 'injection' | 'asset';
    status: 'supported' | 'contradicted' | 'expired_or_superseded' | 'unverifiable' | 'conflicting_evidence' | 'review_needed';
    severity: 'info' | 'warning' | 'blocker';
    source_version_id: string | null;
    source_title: string | null;
    source_version: number | null;
    source_display: string | null;
    quote: string;
    start_idx: number;
    end_idx: number;
    explanation: string;
    suggested_fix: string | null;
    creator_action: 'accepted' | 'edited' | 'dismissed' | null;
    dismiss_reason: string | null;
    link_status: 'confirmed' | 'probable' | null;
  }

  const findingsQuery = `
    SELECT
      f.id,
      f.content_version_id,
      f.claim_id,
      f.kind,
      f.status,
      f.severity,
      f.source_version_id,
      s.title AS source_title,
      sv.version AS source_version,
      COALESCE(sv.value->>'display', sv.value->>'text') AS source_display,
      f.quote,
      f.start_idx,
      f.end_idx,
      f.explanation,
      f.suggested_fix,
      f.creator_action,
      f.dismiss_reason,
      f.link_status
    FROM findings f
    LEFT JOIN source_versions sv ON sv.id = f.source_version_id
    LEFT JOIN sources s ON s.id = sv.source_id
    WHERE f.content_version_id = $1 AND f.workspace_id = $2
    ORDER BY
      CASE f.severity WHEN 'blocker' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
      f.start_idx ASC
  `;

  const findings = await db<RawFinding>(findingsQuery, [activeVer.id, workspaceId]);

  return {
    id: content.id,
    title: content.title,
    created_by: content.created_by,
    created_at: content.created_at,
    versions: versionRows,
    activeVersion: activeVer,
    claims,
    findings,
  };
}

/**
 * Run the analysis pipeline on a content version:
 * 1. Extract claims via Gemini (or regex fallback)
 * 2. Deterministic checks against approved sources
 * 3. Persist claims and findings in Postgres
 * 4. Write audit log
 */
export async function analyzeContentVersion(
  workspaceId: string,
  contentId: string,
  versionId: string,
  actor: string = 'creator'
): Promise<{
  aiAvailable: boolean;
  claimsCount: number;
  findingsCount: number;
  blockerCount: number;
}> {
  await checkAnalysisRateLimit(workspaceId);

  // 1. Get version text
  const verRows = await db<{ text: string }>(
    `SELECT text FROM content_versions WHERE id = $1 AND content_id = $2 AND workspace_id = $3`,
    [versionId, contentId, workspaceId]
  );
  if (verRows.length === 0) throw new Error('Content version not found');
  const text = verRows[0].text;

  // 2. Fetch all current sources in workspace
  const sources = await db<SourceLookup>(
    `SELECT sv.id, s.id as source_id, s.kind, s.key, s.fact_key, s.title, sv.version, sv.value, sv.status, sv.effective_from, sv.valid_until
     FROM source_versions sv
     JOIN sources s ON s.id = sv.source_id
     WHERE s.workspace_id = $1 AND sv.status = 'current'`,
    [workspaceId]
  );

  const allowedKeys: Record<string, string> = {};
  for (const s of sources) {
    if (s.kind === 'fact') {
      const displayVal = s.value?.display ? String(s.value.display) : '';
      allowedKeys[s.key] = `${s.title}: approved value is ${displayVal}`;
    }
  }

  // 3. Extract claims (Gemini or Fallback)
  const extraction = await extractClaims(text, allowedKeys);

  // 4. Run Deterministic Checker
  const computedFindings = await runDeterministicChecks(
    text,
    extraction.claims,
    sources,
    extraction.injectionSuspected
  );

  // 5. Persist Claims & Findings in DB
  await db(`DELETE FROM findings WHERE content_version_id = $1 AND workspace_id = $2`, [versionId, workspaceId]);
  await db(`DELETE FROM claims WHERE content_version_id = $1 AND workspace_id = $2`, [versionId, workspaceId]);

  // Insert claims
  const claimIdMap = new Map<number, string>();
  for (let i = 0; i < extraction.claims.length; i++) {
    const c = extraction.claims[i];
    const inserted = await db<{ id: string }>(
      `INSERT INTO claims (
         content_version_id, workspace_id, quote, start_idx, end_idx, fact_key, value, context
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        versionId,
        workspaceId,
        c.quote,
        c.start_idx,
        c.end_idx,
        c.fact_key,
        c.number !== null ? JSON.stringify({ number: c.number, unit: c.unit }) : null,
        c.context,
      ]
    );
    claimIdMap.set(i, inserted[0].id);
  }

  // Insert findings
  let blockerCount = 0;
  for (const f of computedFindings) {
    if (f.severity === 'blocker') blockerCount++;

    await db(
      `INSERT INTO findings (
         content_version_id, workspace_id, kind, status, severity,
         source_version_id, quote, start_idx, end_idx,
         explanation, suggested_fix, link_status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        versionId,
        workspaceId,
        f.kind,
        f.status,
        f.severity,
        f.source_version_id || null,
        f.quote,
        f.start_idx,
        f.end_idx,
        f.explanation,
        f.suggested_fix || null,
        f.link_status || null,
      ]
    );
  }

  // Update version AI available flag
  await db(
    `UPDATE content_versions SET ai_available = $1 WHERE id = $2 AND workspace_id = $3`,
    [extraction.aiAvailable, versionId, workspaceId]
  );

  // Write audit log
  await db(
    `INSERT INTO audit_log (workspace_id, actor_role, action, entity_type, entity_id, details)
     VALUES ($1, $2, 'content.analyzed', 'content_version', $3, $4)`,
    [
      workspaceId,
      actor,
      versionId,
      JSON.stringify({
        contentId,
        claimsFound: extraction.claims.length,
        findingsCount: computedFindings.length,
        blockerCount,
        aiAvailable: extraction.aiAvailable,
      }),
    ]
  );

  return {
    aiAvailable: extraction.aiAvailable,
    claimsCount: extraction.claims.length,
    findingsCount: computedFindings.length,
    blockerCount,
  };
}

/**
 * Update creator action on a finding (accepted, edited, dismissed)
 */
export async function updateFinding(
  workspaceId: string,
  findingId: string,
  action: 'accepted' | 'edited' | 'dismissed',
  dismissReason?: string,
  actor: string = 'creator'
): Promise<void> {
  if (action === 'dismissed' && (!dismissReason || !dismissReason.trim())) {
    throw new Error('A reason is required when dismissing a finding.');
  }

  await db(
    `UPDATE findings
     SET creator_action = $1, dismiss_reason = $2
     WHERE id = $3 AND workspace_id = $4`,
    [action, dismissReason?.trim() || null, findingId, workspaceId]
  );

  await db(
    `INSERT INTO audit_log (workspace_id, actor_role, action, entity_type, entity_id, details)
     VALUES ($1, $2, 'finding.updated', 'finding', $3, $4)`,
    [
      workspaceId,
      actor,
      findingId,
      JSON.stringify({ action, dismissReason }),
    ]
  );
}



export interface CommentRow {
  id: string;
  workspace_id: string;
  content_version_id: string;
  finding_id: string | null;
  author_role: string;
  body: string;
  created_at: string;
}

/**
 * Add a comment to a content version
 */
export async function addComment(
  workspaceId: string,
  contentId: string,
  versionId: string,
  authorRole: string,
  body: string,
  findingId?: string | null
): Promise<CommentRow> {
  const cleanBody = body.trim();
  if (!cleanBody) throw new Error('Comment cannot be empty.');
  if (cleanBody.length > 500) throw new Error('Comment exceeds 500 characters.');

  // Validate version belongs to content & workspace
  const ver = await db<{ id: string; version: number }>(
    `SELECT id, version FROM content_versions WHERE id = $1 AND content_id = $2 AND workspace_id = $3`,
    [versionId, contentId, workspaceId]
  );
  if (ver.length === 0) {
    throw new Error('Content version not found in this workspace.');
  }

  const rows = await db<CommentRow>(
    `INSERT INTO comments (workspace_id, content_version_id, finding_id, author_role, body)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, workspace_id, content_version_id, finding_id, author_role, body, created_at`,
    [workspaceId, versionId, findingId || null, authorRole, cleanBody]
  );

  const comment = rows[0];

  await db(
    `INSERT INTO audit_log (workspace_id, actor_role, action, entity_type, entity_id, details)
     VALUES ($1, $2, 'comment.created', 'comment', $3, $4)`,
    [
      workspaceId,
      authorRole,
      comment.id,
      JSON.stringify({ contentId, versionId, version: ver[0].version, findingId: findingId || null }),
    ]
  );

  return comment;
}

/**
 * List comments for a content item or specific version
 */
export async function getComments(
  workspaceId: string,
  contentId: string,
  versionId?: string
): Promise<CommentRow[]> {
  if (versionId) {
    return await db<CommentRow>(
      `SELECT c.id, c.workspace_id, c.content_version_id, c.finding_id, c.author_role, c.body, c.created_at
       FROM comments c
       JOIN content_versions cv ON cv.id = c.content_version_id
       WHERE cv.content_id = $1 AND c.content_version_id = $2 AND c.workspace_id = $3
       ORDER BY c.created_at ASC`,
      [contentId, versionId, workspaceId]
    );
  }

  return await db<CommentRow>(
    `SELECT c.id, c.workspace_id, c.content_version_id, c.finding_id, c.author_role, c.body, c.created_at
     FROM comments c
     JOIN content_versions cv ON cv.id = c.content_version_id
     WHERE cv.content_id = $1 AND c.workspace_id = $2
     ORDER BY c.created_at ASC`,
    [contentId, workspaceId]
  );
}

/**
 * Reviewer confirms a probable link, elevating it to confirmed dependency
 */
export async function confirmProbableLink(
  workspaceId: string,
  findingId: string,
  actor: string = 'reviewer'
): Promise<void> {
  await db(
    `UPDATE findings
     SET link_status = 'confirmed'
     WHERE id = $1 AND workspace_id = $2`,
    [findingId, workspaceId]
  );

  await db(
    `INSERT INTO audit_log (workspace_id, actor_role, action, entity_type, entity_id, details)
     VALUES ($1, $2, 'finding.link_confirmed', 'finding', $3, $4)`,
    [workspaceId, actor, findingId, JSON.stringify({ link_status: 'confirmed' })]
  );
}

/**
 * Reviewer rejects a probable link so it will never create a clearance dependency
 */
export async function rejectProbableLink(
  workspaceId: string,
  findingId: string,
  reason?: string,
  actor: string = 'reviewer'
): Promise<void> {
  await db(
    `UPDATE findings
     SET link_status = NULL, dismiss_reason = $1
     WHERE id = $2 AND workspace_id = $3`,
    [reason?.trim() || null, findingId, workspaceId]
  );

  await db(
    `INSERT INTO audit_log (workspace_id, actor_role, action, entity_type, entity_id, details)
     VALUES ($1, $2, 'finding.link_rejected', 'finding', $3, $4)`,
    [workspaceId, actor, findingId, JSON.stringify({ reason })]
  );
}