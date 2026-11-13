import { db } from '@/server/db/client';

export interface RevalidationItemDetail {
  id: string;
  clearance_id: string;
  content_id: string;
  content_title: string;
  version: number;
  reason: string;
  status: 'open' | 'resolved';
  created_at: string;
  quote: string | null;
  source_title: string;
  source_key: string;
  old_version: number;
  old_value: string;
  new_version: number | null;
  new_value: string | null;
}

export interface NotAffectedItem {
  content_id: string;
  content_title: string;
  version: number;
  reason: string;
}

export interface AuditLogRow {
  id: string;
  workspace_id: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

/**
 * Fetch all open revalidation items and unaffected content for the workspace
 */
export async function getRevalidationData(
  workspaceId: string
): Promise<{ items: RevalidationItemDetail[]; notAffected: NotAffectedItem[] }> {
  interface RawRevalRow {
    id: string;
    clearance_id: string;
    content_id: string;
    content_title: string;
    version: number;
    reason: string;
    status: 'open' | 'resolved';
    created_at: string;
    quote: string | null;
    source_title: string;
    source_key: string;
    old_version: number;
    old_value: Record<string, unknown>;
    new_version: number | null;
    new_value: Record<string, unknown> | null;
  }

  const query = `
    SELECT
      ri.id,
      ri.clearance_id,
      c.id AS content_id,
      c.title AS content_title,
      cv.version,
      ri.reason,
      ri.status,
      ri.created_at,
      (SELECT clm.quote FROM clearance_dependencies cd2
       LEFT JOIN claims clm ON clm.id = cd2.claim_id
       WHERE cd2.clearance_id = ri.clearance_id AND cd2.source_version_id = ri.trigger_source_version_id
       LIMIT 1
      ) AS quote,
      s.title AS source_title,
      s.key AS source_key,
      sv_old.version AS old_version,
      sv_old.value AS old_value,
      sv_new.version AS new_version,
      sv_new.value AS new_value
    FROM revalidation_items ri
    JOIN clearances cl ON cl.id = ri.clearance_id
    JOIN content_versions cv ON cv.id = cl.content_version_id
    JOIN contents c ON c.id = cv.content_id
    JOIN source_versions sv_old ON sv_old.id = ri.trigger_source_version_id
    JOIN sources s ON s.id = sv_old.source_id
    LEFT JOIN source_versions sv_new ON sv_new.id = ri.new_source_version_id
    WHERE ri.workspace_id = $1 AND ri.status = 'open'
    ORDER BY ri.created_at DESC
  `;

  interface RawNotAffected {
    content_id: string;
    content_title: string;
    version: number;
    quote: string;
    context: string;
  }

  const notAffectedQuery = `
    SELECT DISTINCT
      c.id AS content_id,
      c.title AS content_title,
      cv.version,
      clm.quote,
      clm.context
    FROM clearances cl
    JOIN content_versions cv ON cv.id = cl.content_version_id
    JOIN contents c ON c.id = cv.content_id
    JOIN claims clm ON clm.content_version_id = cv.id
    WHERE cl.workspace_id = $1
      AND cl.state = 'current'
      AND clm.context IN ('historical', 'quoted', 'hypothetical')
      AND NOT EXISTS (
        SELECT 1 FROM revalidation_items ri
        WHERE ri.clearance_id = cl.id AND ri.status = 'open'
      )
  `;

  // Parallelize both queries for speed
  const [rows, notAffectedRows] = await Promise.all([
    db<RawRevalRow>(query, [workspaceId]),
    db<RawNotAffected>(notAffectedQuery, [workspaceId]),
  ]);

  const items: RevalidationItemDetail[] = rows.map(r => {
    const oldDisplay = r.old_value?.display
      ? String(r.old_value.display)
      : r.old_value?.text
      ? String(r.old_value.text)
      : JSON.stringify(r.old_value);

    const newDisplay = r.new_value
      ? r.new_value.display
        ? String(r.new_value.display)
        : r.new_value.text
        ? String(r.new_value.text)
        : JSON.stringify(r.new_value)
      : null;

    return {
      id: r.id,
      clearance_id: r.clearance_id,
      content_id: r.content_id,
      content_title: r.content_title,
      version: r.version,
      reason: r.reason,
      status: r.status,
      created_at: r.created_at,
      quote: r.quote,
      source_title: r.source_title,
      source_key: r.source_key,
      old_version: r.old_version,
      old_value: oldDisplay,
      new_version: r.new_version,
      new_value: newDisplay,
    };
  });

  const notAffected: NotAffectedItem[] = notAffectedRows.map(r => ({
    content_id: r.content_id,
    content_title: r.content_title,
    version: r.version,
    reason: `Mentions "${r.quote}" in a ${r.context} context; creates no dependency on current facts.`,
  }));

  return { items, notAffected };
}

/**
 * Resolve a revalidation item:
 * - 'reapprove': Creates a new clearance linked to the new current source versions.
 * - 'send_back': Rejects current clearance and moves content version back to draft for creator revision.
 */
export async function resolveRevalidationItem(
  workspaceId: string,
  itemId: string,
  action: 'reapprove' | 'send_back',
  comment: string = '',
  reviewer: string = 'reviewer'
): Promise<{ success: boolean; newClearanceId?: string }> {
  interface RevalItemInfo {
    id: string;
    clearance_id: string;
    content_version_id: string;
    trigger_source_version_id: string;
    new_source_version_id: string | null;
    content_title: string;
  }

  const rows = await db<RevalItemInfo>(
    `SELECT
       ri.id, ri.clearance_id, cl.content_version_id,
       ri.trigger_source_version_id, ri.new_source_version_id,
       c.title AS content_title
     FROM revalidation_items ri
     JOIN clearances cl ON cl.id = ri.clearance_id
     JOIN content_versions cv ON cv.id = cl.content_version_id
     JOIN contents c ON c.id = cv.content_id
     WHERE ri.id = $1 AND ri.workspace_id = $2 AND ri.status = 'open'`,
    [itemId, workspaceId]
  );

  if (rows.length === 0) {
    throw new Error('Open revalidation item not found.');
  }

  const item = rows[0];

  // 1. Mark revalidation item as resolved
  await db(
    `UPDATE revalidation_items
     SET status = 'resolved', resolved_at = now()
     WHERE id = $1 AND workspace_id = $2`,
    [itemId, workspaceId]
  );

  if (action === 'reapprove') {
    // 2. Mark previous clearance as revalidated / superseded
    await db(
      `UPDATE clearances SET state = 'revalidation_required' WHERE id = $1 AND workspace_id = $2`,
      [item.clearance_id, workspaceId]
    );

    // 3. Create a fresh clearance
    const newClearanceRows = await db<{ id: string }>(
      `INSERT INTO clearances (
         workspace_id, content_version_id, decision, state, reviewer, comment
       ) VALUES ($1, $2, 'approved', 'current', $3, $4)
       RETURNING id`,
      [
        workspaceId,
        item.content_version_id,
        reviewer,
        comment.trim() || 'Re-approved with updated current source versions.',
      ]
    );
    const newClearanceId = newClearanceRows[0].id;

    // 4. Copy existing dependencies, updating the triggered source version to new_source_version_id
    interface DepRow {
      source_version_id: string;
      claim_id: string | null;
      link_status: string;
    }
    const oldDeps = await db<DepRow>(
      `SELECT source_version_id, claim_id, link_status
       FROM clearance_dependencies
       WHERE clearance_id = $1 AND workspace_id = $2`,
      [item.clearance_id, workspaceId]
    );

    for (const d of oldDeps) {
      const targetSourceVer =
        d.source_version_id === item.trigger_source_version_id && item.new_source_version_id
          ? item.new_source_version_id
          : d.source_version_id;

      await db(
        `INSERT INTO clearance_dependencies (
           clearance_id, workspace_id, source_version_id, claim_id, link_status
         ) VALUES ($1, $2, $3, $4, $5)`,
        [newClearanceId, workspaceId, targetSourceVer, d.claim_id, d.link_status]
      );
    }

    // 5. Update content_version state back to cleared
    await db(
      `UPDATE content_versions SET state = 'cleared' WHERE id = $1 AND workspace_id = $2`,
      [item.content_version_id, workspaceId]
    );

    // 6. Audit log
    await db(
      `INSERT INTO audit_log (workspace_id, actor_role, action, entity_type, entity_id, details)
       VALUES ($1, $2, 'clearance.reapproved', 'clearance', $3, $4)`,
      [
        workspaceId,
        reviewer,
        newClearanceId,
        JSON.stringify({
          previousClearanceId: item.clearance_id,
          contentTitle: item.content_title,
          revalidationItemId: itemId,
          comment,
        }),
      ]
    );

    return { success: true, newClearanceId };
  } else {
    // Send back to creator
    await db(
      `UPDATE clearances SET state = 'rejected' WHERE id = $1 AND workspace_id = $2`,
      [item.clearance_id, workspaceId]
    );

    await db(
      `UPDATE content_versions SET state = 'draft' WHERE id = $1 AND workspace_id = $2`,
      [item.content_version_id, workspaceId]
    );

    await db(
      `INSERT INTO audit_log (workspace_id, actor_role, action, entity_type, entity_id, details)
       VALUES ($1, $2, 'clearance.sent_back', 'content_version', $3, $4)`,
      [
        workspaceId,
        reviewer,
        item.content_version_id,
        JSON.stringify({
          clearanceId: item.clearance_id,
          contentTitle: item.content_title,
          comment,
        }),
      ]
    );

    return { success: true };
  }
}

/**
 * Fetch latest audit log rows for the workspace
 */
export async function getAuditLogs(workspaceId: string, limit = 200): Promise<AuditLogRow[]> {
  const query = `
    SELECT id::text, workspace_id, actor_role, action, entity_type, entity_id, details, created_at
    FROM audit_log
    WHERE workspace_id = $1
    ORDER BY created_at DESC
    LIMIT $2
  `;

  return await db<AuditLogRow>(query, [workspaceId, limit]);
}

