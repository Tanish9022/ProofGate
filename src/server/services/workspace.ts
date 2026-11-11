import { db } from '@/server/db/client';
import { SEED_SOURCES, DEMO_WORKSPACE_NAME } from '@/server/db/seedData';

export interface WorkspaceRow {
  id: string;
  name: string;
  created_at: string;
}

/**
 * Pre-seed the historical case study with an approved clearance (context: historical).
 * This demonstrates selective revalidation: when Pro price changes to 699, this clearance
 * remains unaffected because historical claims do not create dependencies on current facts.
 */
async function seedSampleB(wsId: string): Promise<void> {
  const caseStudyText = 'In 2025, Acme Retail paid Rs. 399 per user per month before moving to the Pro plan and cutting ticket response time by half.';
  const hash = 'sample-b-seed-hash';

  const contentRows = await db<{ id: string }>(
    `INSERT INTO contents (workspace_id, title, created_by)
     VALUES ($1, 'Acme Retail Case Study (2025)', 'seed')
     RETURNING id`,
    [wsId]
  );
  const contentId = contentRows[0].id;

  const verRows = await db<{ id: string }>(
    `INSERT INTO content_versions (
       content_id, workspace_id, version, text, file_hash, state, ai_available
     ) VALUES ($1, $2, 1, $3, $4, 'cleared', true)
     RETURNING id`,
    [contentId, wsId, caseStudyText, hash]
  );
  const versionId = verRows[0].id;

  // Insert historical claim
  await db(
    `INSERT INTO claims (
       content_version_id, workspace_id, quote, start_idx, end_idx, fact_key, value, context
     ) VALUES ($1, $2, 'Rs. 399 per user per month', 29, 56, 'pro_price', $3, 'historical')`,
    [versionId, wsId, JSON.stringify({ number: 399, unit: 'INR_per_user_month' })]
  );

  // Insert clearance with state = 'current'
  await db(
    `INSERT INTO clearances (
       workspace_id, content_version_id, decision, state, reviewer, comment
     ) VALUES ($1, $2, 'approved', 'current', 'reviewer', 'Pre-cleared historical case study')`,
    [wsId, versionId]
  );
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

  // Pre-seed cleared historical case study
  await seedSampleB(wsId);

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

  // Pre-seed cleared historical case study
  await seedSampleB(wsId);
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
