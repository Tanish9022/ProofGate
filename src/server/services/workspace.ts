import { db } from '@/server/db/client';
import { SEED_SOURCES, DEMO_WORKSPACE_NAME } from '@/server/db/seedData';

export interface WorkspaceRow {
  id: string;
  name: string;
  created_at: string;
}

/**
 * Idempotent workspace init.
 * Creates a new workspace and clones the seed data into it.
 * Uses INSERT ... RETURNING so only one workspace is created per call.
 * Middleware sets the cookie server-side, preventing React double-invoke from creating two workspaces.
 */
export async function initWorkspace(): Promise<string> {
  // Insert new per-visitor workspace
  const rows = await db<{ id: string }>(
    `INSERT INTO workspaces (name) VALUES ($1) RETURNING id`,
    [`${DEMO_WORKSPACE_NAME} — ${new Date().toISOString()}`]
  );
  const wsId = rows[0].id;

  // Clone seed sources into this workspace
  for (const s of SEED_SOURCES) {
    const sourceRows = await db<{ id: string }>(
      `INSERT INTO sources (workspace_id, kind, key, title, owner)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [wsId, s.kind, s.key, s.title, s.owner]
    );
    const sourceId = sourceRows[0].id;
    await db(
      `INSERT INTO source_versions (source_id, workspace_id, version, value, status, valid_until, created_by)
       VALUES ($1, $2, 1, $3, 'current', $4, 'seed')`,
      [sourceId, wsId, JSON.stringify(s.value), s.validUntil]
    );
  }

  return wsId;
}

/**
 * Wipe all data for this workspace and re-clone seed data.
 */
export async function resetWorkspace(wsId: string): Promise<void> {
  await db(`DELETE FROM contents WHERE workspace_id = $1`, [wsId]);
  await db(`DELETE FROM sources WHERE workspace_id = $1`, [wsId]);

  for (const s of SEED_SOURCES) {
    const sourceRows = await db<{ id: string }>(
      `INSERT INTO sources (workspace_id, kind, key, title, owner)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [wsId, s.kind, s.key, s.title, s.owner]
    );
    const sourceId = sourceRows[0].id;
    await db(
      `INSERT INTO source_versions (source_id, workspace_id, version, value, status, valid_until, created_by)
       VALUES ($1, $2, 1, $3, 'current', $4, 'seed')`,
      [sourceId, wsId, JSON.stringify(s.value), s.validUntil]
    );
  }
}

/**
 * Returns the count of sources for this workspace.
 * Used for "Checking against N sources" UI string — always the real count.
 */
export async function getSourceCount(wsId: string): Promise<number> {
  const rows = await db<{ count: string }>(
    `SELECT COUNT(*) as count FROM sources WHERE workspace_id = $1`,
    [wsId]
  );
  return parseInt(rows[0].count, 10);
}

export async function getWorkspace(wsId: string): Promise<WorkspaceRow | null> {
  const rows = await db<WorkspaceRow>(`SELECT * FROM workspaces WHERE id = $1`, [wsId]);
  return rows[0] ?? null;
}
