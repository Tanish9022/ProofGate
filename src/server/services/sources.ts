import { db } from '@/server/db/client';

export type SourceKind = 'fact' | 'term' | 'guideline' | 'asset';
export type SourceStatus = 'current' | 'superseded' | 'expired' | 'withdrawn';

export interface SourceSummary {
  id: string;
  kind: SourceKind;
  key: string;
  title: string;
  owner: string;
  current: {
    id: string;
    version: number;
    value: Record<string, unknown>;
    status: SourceStatus;
    validUntil: string | null;
  } | null;
  versionCount: number;
  clearanceCount: number;
}

export interface SourceVersionRow {
  id: string;
  source_id: string;
  workspace_id: string;
  version: number;
  value: Record<string, unknown>;
  status: SourceStatus;
  effective_from: string;
  valid_until: string | null;
  change_note: string | null;
  created_by: string;
  created_at: string;
}

export interface DependentClearance {
  clearance_id: string;
  content_id: string;
  content_title: string;
  content_version: number;
  state: string;
  reviewer: string;
  decided_at: string;
}

export interface SourceDetail {
  id: string;
  kind: SourceKind;
  key: string;
  title: string;
  owner: string;
  versions: SourceVersionRow[];
  currentVersion: SourceVersionRow | null;
  clearances: DependentClearance[];
}

export interface AffectedClearance {
  clearanceId: string;
  contentTitle: string;
  reason: string;
}

/**
 * Build a human-readable reason string for changes between versions
 */
function formatChangeReason(
  title: string,
  oldVal: Record<string, unknown>,
  newVal: Record<string, unknown>,
  changeNote?: string
): string {
  if (oldVal && newVal && typeof oldVal.number === 'number' && typeof newVal.number === 'number') {
    const oldUnit = oldVal.unit || '';
    const newUnit = newVal.unit || '';
    return `${title} changed from ${oldVal.display || `${oldVal.number} ${oldUnit}`} to ${newVal.display || `${newVal.number} ${newUnit}`}`;
  }
  if (changeNote && changeNote.trim()) {
    return `${title} updated: ${changeNote.trim()}`;
  }
  return `${title} updated to new version`;
}

/**
 * List all sources in a workspace with their current version and counts
 */
export async function getSources(workspaceId: string): Promise<SourceSummary[]> {
  const query = `
    SELECT
      s.id,
      s.kind,
      s.key,
      s.title,
      s.owner,
      sv.id AS current_version_id,
      sv.version AS current_version,
      sv.value AS current_value,
      sv.status AS current_status,
      to_char(sv.valid_until, 'YYYY-MM-DD') AS current_valid_until,
      (SELECT COUNT(*)::int FROM source_versions sv_all WHERE sv_all.source_id = s.id) AS version_count,
      (SELECT COUNT(DISTINCT cd.clearance_id)::int
       FROM clearance_dependencies cd
       JOIN clearances c ON c.id = cd.clearance_id
       WHERE cd.source_version_id = sv.id
         AND cd.link_status = 'confirmed'
         AND c.state = 'current'
      ) AS clearance_count
    FROM sources s
    LEFT JOIN source_versions sv ON sv.source_id = s.id AND sv.status = 'current'
    WHERE s.workspace_id = $1
    ORDER BY s.title ASC
  `;

  interface RawRow {
    id: string;
    kind: SourceKind;
    key: string;
    title: string;
    owner: string;
    current_version_id: string | null;
    current_version: number | null;
    current_value: Record<string, unknown> | null;
    current_status: SourceStatus | null;
    current_valid_until: string | null;
    version_count: number;
    clearance_count: number;
  }

  const rows = await db<RawRow>(query, [workspaceId]);

  return rows.map(r => ({
    id: r.id,
    kind: r.kind,
    key: r.key,
    title: r.title,
    owner: r.owner,
    current: r.current_version_id
      ? {
          id: r.current_version_id,
          version: r.current_version!,
          value: r.current_value!,
          status: r.current_status!,
          validUntil: r.current_valid_until,
        }
      : null,
    versionCount: r.version_count ?? 0,
    clearanceCount: r.clearance_count ?? 0,
  }));
}

/**
 * Get source by ID, including its full version history and clearances
 */
export async function getSourceById(
  workspaceId: string,
  sourceId: string
): Promise<SourceDetail | null> {
  const sourceRows = await db<{
    id: string;
    kind: SourceKind;
    key: string;
    title: string;
    owner: string;
  }>(
    `SELECT id, kind, key, title, owner FROM sources WHERE id = $1 AND workspace_id = $2`,
    [sourceId, workspaceId]
  );

  if (sourceRows.length === 0) return null;
  const source = sourceRows[0];

  const versionRows = await db<SourceVersionRow>(
    `SELECT
       id, source_id, workspace_id, version, value, status,
       to_char(effective_from, 'YYYY-MM-DD') as effective_from,
       to_char(valid_until, 'YYYY-MM-DD') as valid_until,
       change_note, created_by, created_at
     FROM source_versions
     WHERE source_id = $1 AND workspace_id = $2
     ORDER BY version DESC`,
    [sourceId, workspaceId]
  );

  const currentVersion = versionRows.find(v => v.status === 'current') ?? null;

  let clearances: DependentClearance[] = [];
  if (currentVersion) {
    clearances = await db<DependentClearance>(
      `SELECT
         c.id AS clearance_id,
         cv.content_id,
         ct.title AS content_title,
         cv.version AS content_version,
         c.state,
         c.reviewer,
         c.decided_at
       FROM clearance_dependencies cd
       JOIN clearances c ON c.id = cd.clearance_id
       JOIN content_versions cv ON cv.id = c.content_version_id
       JOIN contents ct ON ct.id = cv.content_id
       WHERE cd.source_version_id = $1
         AND cd.link_status = 'confirmed'
       ORDER BY c.decided_at DESC`,
      [currentVersion.id]
    );
  }

  return {
    id: source.id,
    kind: source.kind,
    key: source.key,
    title: source.title,
    owner: source.owner,
    versions: versionRows,
    currentVersion,
    clearances,
  };
}

/**
 * Create a new source with version 1
 */
export async function createSource(
  workspaceId: string,
  data: {
    kind: SourceKind;
    key: string;
    title: string;
    owner: string;
    value: Record<string, unknown>;
    validUntil?: string | null;
  },
  actor: string = 'admin'
): Promise<string> {
  const sourceRows = await db<{ id: string }>(
    `INSERT INTO sources (workspace_id, kind, key, title, owner)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [workspaceId, data.kind, data.key, data.title, data.owner]
  );
  const sourceId = sourceRows[0].id;

  await db(
    `INSERT INTO source_versions (source_id, workspace_id, version, value, status, valid_until, created_by)
     VALUES ($1, $2, 1, $3, 'current', $4, $5)`,
    [sourceId, workspaceId, JSON.stringify(data.value), data.validUntil || null, actor]
  );

  await db(
    `INSERT INTO audit_log (workspace_id, actor_role, action, entity_type, entity_id, details)
     VALUES ($1, $2, 'source.created', 'source', $3, $4)`,
    [
      workspaceId,
      actor,
      sourceId,
      JSON.stringify({ key: data.key, title: data.title, kind: data.kind }),
    ]
  );

  return sourceId;
}

/**
 * Preview impact: which clearances would be affected if source is superseded/withdrawn/expired
 */
export async function getImpactPreview(
  workspaceId: string,
  sourceId: string
): Promise<AffectedClearance[]> {
  const currentVer = await db<{ id: string; title: string }>(
    `SELECT sv.id, s.title
     FROM source_versions sv
     JOIN sources s ON s.id = sv.source_id
     WHERE s.id = $1 AND s.workspace_id = $2 AND sv.status = 'current'`,
    [sourceId, workspaceId]
  );

  if (currentVer.length === 0) return [];
  const { id: currentVerId, title } = currentVer[0];

  interface DepRow {
    clearance_id: string;
    content_title: string;
  }

  const deps = await db<DepRow>(
    `SELECT c.id AS clearance_id, ct.title AS content_title
     FROM clearance_dependencies cd
     JOIN clearances c ON c.id = cd.clearance_id
     JOIN content_versions cv ON cv.id = c.content_version_id
     JOIN contents ct ON ct.id = cv.content_id
     WHERE cd.source_version_id = $1
       AND cd.link_status = 'confirmed'
       AND c.state = 'current'`,
    [currentVerId]
  );

  return deps.map(d => ({
    clearanceId: d.clearance_id,
    contentTitle: d.content_title,
    reason: `Depends on ${title}`,
  }));
}

/**
 * Supersede the current version with a new version (v_next).
 * Updates old version to 'superseded', creates new 'current' version,
 * and moves all dependent 'current' clearances with 'confirmed' link to 'revalidation_required'.
 */
export async function supersedeSource(
  workspaceId: string,
  sourceId: string,
  data: {
    value: Record<string, unknown>;
    changeNote?: string;
    validUntil?: string | null;
  },
  actor: string = 'admin'
): Promise<{ newVersion: number; affected: AffectedClearance[] }> {
  // 1. Get current version & source title
  const currentRows = await db<{
    id: string;
    version: number;
    value: Record<string, unknown>;
    title: string;
  }>(
    `SELECT sv.id, sv.version, sv.value, s.title
     FROM source_versions sv
     JOIN sources s ON s.id = sv.source_id
     WHERE s.id = $1 AND s.workspace_id = $2 AND sv.status = 'current'`,
    [sourceId, workspaceId]
  );

  if (currentRows.length === 0) {
    throw new Error('No current version found for this source to supersede');
  }

  const oldVer = currentRows[0];
  const nextVerNumber = oldVer.version + 1;

  // 2. Mark old version as superseded
  await db(`UPDATE source_versions SET status = 'superseded' WHERE id = $1`, [oldVer.id]);

  // 3. Insert new version
  const newVerRows = await db<{ id: string }>(
    `INSERT INTO source_versions (source_id, workspace_id, version, value, status, valid_until, change_note, created_by)
     VALUES ($1, $2, $3, $4, 'current', $5, $6, $7)
     RETURNING id`,
    [
      sourceId,
      workspaceId,
      nextVerNumber,
      JSON.stringify(data.value),
      data.validUntil || null,
      data.changeNote || null,
      actor,
    ]
  );
  const newVerId = newVerRows[0].id;

  // 4. Find affected clearances (ONLY clearances in state 'current' with confirmed link)
  interface AffectedRow {
    clearance_id: string;
    content_version_id: string;
    content_title: string;
  }

  const affectedRows = await db<AffectedRow>(
    `SELECT c.id AS clearance_id, c.content_version_id, ct.title AS content_title
     FROM clearance_dependencies cd
     JOIN clearances c ON c.id = cd.clearance_id
     JOIN content_versions cv ON cv.id = c.content_version_id
     JOIN contents ct ON ct.id = cv.content_id
     WHERE cd.source_version_id = $1
       AND cd.link_status = 'confirmed'
       AND c.state = 'current'`,
    [oldVer.id]
  );

  const reasonStr = formatChangeReason(oldVer.title, oldVer.value, data.value, data.changeNote);
  const affected: AffectedClearance[] = [];

  for (const row of affectedRows) {
    // Insert revalidation item
    await db(
      `INSERT INTO revalidation_items (
         workspace_id, clearance_id, trigger_source_version_id, new_source_version_id, reason, status
       ) VALUES ($1, $2, $3, $4, $5, 'open')`,
      [workspaceId, row.clearance_id, oldVer.id, newVerId, reasonStr]
    );

    // Update clearance state
    await db(
      `UPDATE clearances SET state = 'revalidation_required' WHERE id = $1`,
      [row.clearance_id]
    );

    // Update content_version state
    await db(
      `UPDATE content_versions SET state = 'revalidation_required' WHERE id = $1`,
      [row.content_version_id]
    );

    affected.push({
      clearanceId: row.clearance_id,
      contentTitle: row.content_title,
      reason: reasonStr,
    });
  }

  // 5. Audit log
  await db(
    `INSERT INTO audit_log (workspace_id, actor_role, action, entity_type, entity_id, details)
     VALUES ($1, $2, 'source.superseded', 'source', $3, $4)`,
    [
      workspaceId,
      actor,
      sourceId,
      JSON.stringify({
        sourceTitle: oldVer.title,
        oldVersion: oldVer.version,
        newVersion: nextVerNumber,
        changeNote: data.changeNote,
        affectedCount: affected.length,
      }),
    ]
  );

  return { newVersion: nextVerNumber, affected };
}

/**
 * Withdraw a source: marks current version 'withdrawn' and triggers revalidation
 */
export async function withdrawSource(
  workspaceId: string,
  sourceId: string,
  reason: string,
  actor: string = 'admin'
): Promise<{ affected: AffectedClearance[] }> {
  const currentRows = await db<{
    id: string;
    version: number;
    title: string;
  }>(
    `SELECT sv.id, sv.version, s.title
     FROM source_versions sv
     JOIN sources s ON s.id = sv.source_id
     WHERE s.id = $1 AND s.workspace_id = $2 AND sv.status = 'current'`,
    [sourceId, workspaceId]
  );

  if (currentRows.length === 0) {
    throw new Error('No current version found for this source to withdraw');
  }

  const ver = currentRows[0];

  // Mark withdrawn
  await db(
    `UPDATE source_versions SET status = 'withdrawn', change_note = $1 WHERE id = $2`,
    [reason, ver.id]
  );

  // Find affected clearances
  interface AffectedRow {
    clearance_id: string;
    content_version_id: string;
    content_title: string;
  }

  const affectedRows = await db<AffectedRow>(
    `SELECT c.id AS clearance_id, c.content_version_id, ct.title AS content_title
     FROM clearance_dependencies cd
     JOIN clearances c ON c.id = cd.clearance_id
     JOIN content_versions cv ON cv.id = c.content_version_id
     JOIN contents ct ON ct.id = cv.content_id
     WHERE cd.source_version_id = $1
       AND cd.link_status = 'confirmed'
       AND c.state = 'current'`,
    [ver.id]
  );

  const reasonStr = `Source "${ver.title}" was withdrawn: ${reason}`;
  const affected: AffectedClearance[] = [];

  for (const row of affectedRows) {
    await db(
      `INSERT INTO revalidation_items (
         workspace_id, clearance_id, trigger_source_version_id, reason, status
       ) VALUES ($1, $2, $3, $4, 'open')`,
      [workspaceId, row.clearance_id, ver.id, reasonStr]
    );

    await db(`UPDATE clearances SET state = 'revalidation_required' WHERE id = $1`, [row.clearance_id]);
    await db(`UPDATE content_versions SET state = 'revalidation_required' WHERE id = $1`, [row.content_version_id]);

    affected.push({
      clearanceId: row.clearance_id,
      contentTitle: row.content_title,
      reason: reasonStr,
    });
  }

  await db(
    `INSERT INTO audit_log (workspace_id, actor_role, action, entity_type, entity_id, details)
     VALUES ($1, $2, 'source.withdrawn', 'source', $3, $4)`,
    [
      workspaceId,
      actor,
      sourceId,
      JSON.stringify({
        sourceTitle: ver.title,
        version: ver.version,
        reason,
        affectedCount: affected.length,
      }),
    ]
  );

  return { affected };
}

/**
 * Expire a source: marks current version 'expired' and triggers revalidation
 */
export async function expireSource(
  workspaceId: string,
  sourceId: string,
  actor: string = 'admin'
): Promise<{ affected: AffectedClearance[] }> {
  const currentRows = await db<{
    id: string;
    version: number;
    title: string;
  }>(
    `SELECT sv.id, sv.version, s.title
     FROM source_versions sv
     JOIN sources s ON s.id = sv.source_id
     WHERE s.id = $1 AND s.workspace_id = $2 AND sv.status = 'current'`,
    [sourceId, workspaceId]
  );

  if (currentRows.length === 0) {
    throw new Error('No current version found for this source to expire');
  }

  const ver = currentRows[0];

  // Mark expired
  await db(`UPDATE source_versions SET status = 'expired' WHERE id = $1`, [ver.id]);

  // Find affected clearances
  interface AffectedRow {
    clearance_id: string;
    content_version_id: string;
    content_title: string;
  }

  const affectedRows = await db<AffectedRow>(
    `SELECT c.id AS clearance_id, c.content_version_id, ct.title AS content_title
     FROM clearance_dependencies cd
     JOIN clearances c ON c.id = cd.clearance_id
     JOIN content_versions cv ON cv.id = c.content_version_id
     JOIN contents ct ON ct.id = cv.content_id
     WHERE cd.source_version_id = $1
       AND cd.link_status = 'confirmed'
       AND c.state = 'current'`,
    [ver.id]
  );

  const reasonStr = `Source "${ver.title}" has expired`;
  const affected: AffectedClearance[] = [];

  for (const row of affectedRows) {
    await db(
      `INSERT INTO revalidation_items (
         workspace_id, clearance_id, trigger_source_version_id, reason, status
       ) VALUES ($1, $2, $3, $4, 'open')`,
      [workspaceId, row.clearance_id, ver.id, reasonStr]
    );

    await db(`UPDATE clearances SET state = 'revalidation_required' WHERE id = $1`, [row.clearance_id]);
    await db(`UPDATE content_versions SET state = 'revalidation_required' WHERE id = $1`, [row.content_version_id]);

    affected.push({
      clearanceId: row.clearance_id,
      contentTitle: row.content_title,
      reason: reasonStr,
    });
  }

  await db(
    `INSERT INTO audit_log (workspace_id, actor_role, action, entity_type, entity_id, details)
     VALUES ($1, $2, 'source.expired', 'source', $3, $4)`,
    [
      workspaceId,
      actor,
      sourceId,
      JSON.stringify({
        sourceTitle: ver.title,
        version: ver.version,
        affectedCount: affected.length,
      }),
    ]
  );

  return { affected };
}

