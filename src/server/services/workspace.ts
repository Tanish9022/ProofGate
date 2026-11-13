import { db } from '@/server/db/client';
import { SEED_SOURCES, DEMO_WORKSPACE_NAME } from '@/server/db/seedData';

export interface WorkspaceRow {
  id: string;
  name: string;
  created_at: string;
}

/**
 * Pre-seed Sample A (fixed promotional poster) with an approved clearance and confirmed dependencies
 * on pro_price, trial_days, uptime_sla, term_banned_guaranteed, and guideline_tone.
 * When an admin supersedes or withdraws any of these in the library, this clearance selectively moves
 * to revalidation, while Sample B (historical) remains unaffected.
 */
async function seedSampleA(wsId: string): Promise<void> {
  const srcRows = await db<{ id: string; key: string }>(
    `SELECT sv.id, s.key FROM source_versions sv
     JOIN sources s ON s.id = sv.source_id
     WHERE s.workspace_id = $1 AND sv.status = 'current'`,
    [wsId]
  );
  const srcMap = new Map(srcRows.map(r => [r.key, r.id]));

  const posterText = 'BrightDesk Pro: now just Rs. 499 per user per month.\nTry it free for 14 days.\nBuilt for 99.9% uptime.';
  const hash = 'sample-a-seed-hash';

  const contentRows = await db<{ id: string }>(
    `INSERT INTO contents (workspace_id, title, created_by)
     VALUES ($1, 'BrightDesk Pro Launch Poster', 'seed')
     RETURNING id`,
    [wsId]
  );
  const contentId = contentRows[0].id;

  const verRows = await db<{ id: string }>(
    `INSERT INTO content_versions (
       content_id, workspace_id, version, text, file_hash, state, ai_available
     ) VALUES ($1, $2, 2, $3, $4, 'cleared', true)
     RETURNING id`,
    [contentId, wsId, posterText, hash]
  );
  const versionId = verRows[0].id;

  // Insert clearance with state = 'current' (safe with ON CONFLICT)
  const clRows = await db<{ id: string }>(
    `INSERT INTO clearances (
       workspace_id, content_version_id, decision, state, reviewer, comment
     ) VALUES ($1, $2, 'approved', 'current', 'reviewer', 'Approved promotional poster (v2 clean)')
     ON CONFLICT (content_version_id) DO UPDATE SET
       decision = EXCLUDED.decision,
       state = EXCLUDED.state,
       reviewer = EXCLUDED.reviewer,
       comment = EXCLUDED.comment,
       decided_at = NOW()
     RETURNING id`,
    [wsId, versionId]
  );
  const clearanceId = clRows[0].id;

  // Clear any existing dependencies
  await db(`DELETE FROM clearance_dependencies WHERE clearance_id = $1`, [clearanceId]);

  // 1. Pro price dependency
  const proVerId = srcMap.get('pro_price');
  if (proVerId) {
    const claimRows = await db<{ id: string }>(
      `INSERT INTO claims (
         content_version_id, workspace_id, quote, start_idx, end_idx, fact_key, value, context
       ) VALUES ($1, $2, 'Rs. 499 per user per month', 25, 51, 'pro_price', $3, 'current')
       RETURNING id`,
      [versionId, wsId, JSON.stringify({ number: 499, unit: 'INR_per_user_month' })]
    );
    await db(
      `INSERT INTO findings (
         content_version_id, workspace_id, kind, status, severity,
         source_version_id, quote, start_idx, end_idx,
         explanation, link_status
       ) VALUES ($1, $2, 'claim', 'supported', 'info', $3, 'Rs. 499 per user per month', 25, 51, 'Matches approved Pro plan price (Rs. 499, v1).', 'confirmed')`,
      [versionId, wsId, proVerId]
    );
    await db(
      `INSERT INTO clearance_dependencies (clearance_id, workspace_id, source_version_id, claim_id, link_status)
       VALUES ($1, $2, $3, $4, 'confirmed')`,
      [clearanceId, wsId, proVerId, claimRows[0].id]
    );
  }

  // 2. Free trial length dependency
  const trialVerId = srcMap.get('trial_days');
  if (trialVerId) {
    const claimRows = await db<{ id: string }>(
      `INSERT INTO claims (
         content_version_id, workspace_id, quote, start_idx, end_idx, fact_key, value, context
       ) VALUES ($1, $2, '14 days', 69, 76, 'trial_days', $3, 'current')
       RETURNING id`,
      [versionId, wsId, JSON.stringify({ number: 14, unit: 'days' })]
    );
    await db(
      `INSERT INTO findings (
         content_version_id, workspace_id, kind, status, severity,
         source_version_id, quote, start_idx, end_idx,
         explanation, link_status
       ) VALUES ($1, $2, 'claim', 'supported', 'info', $3, '14 days', 69, 76, 'Matches approved trial length (14 days, v1).', 'confirmed')`,
      [versionId, wsId, trialVerId]
    );
    await db(
      `INSERT INTO clearance_dependencies (clearance_id, workspace_id, source_version_id, claim_id, link_status)
       VALUES ($1, $2, $3, $4, 'confirmed')`,
      [clearanceId, wsId, trialVerId, claimRows[0].id]
    );
  }

  // 3. Uptime SLA dependency
  const uptimeVerId = srcMap.get('uptime_sla');
  if (uptimeVerId) {
    const claimRows = await db<{ id: string }>(
      `INSERT INTO claims (
         content_version_id, workspace_id, quote, start_idx, end_idx, fact_key, value, context
       ) VALUES ($1, $2, '99.9% uptime', 87, 100, 'uptime_sla', $3, 'current')
       RETURNING id`,
      [versionId, wsId, JSON.stringify({ number: 99.9, unit: 'percent' })]
    );
    await db(
      `INSERT INTO findings (
         content_version_id, workspace_id, kind, status, severity,
         source_version_id, quote, start_idx, end_idx,
         explanation, link_status
       ) VALUES ($1, $2, 'claim', 'supported', 'info', $3, '99.9% uptime', 87, 100, 'Matches approved uptime SLA (99.9%, v1).', 'confirmed')`,
      [versionId, wsId, uptimeVerId]
    );
    await db(
      `INSERT INTO clearance_dependencies (clearance_id, workspace_id, source_version_id, claim_id, link_status)
       VALUES ($1, $2, $3, $4, 'confirmed')`,
      [clearanceId, wsId, uptimeVerId, claimRows[0].id]
    );
  }

  // 4. Term rule dependency (guarantee)
  const termBannedVerId = srcMap.get('term_banned_guaranteed');
  if (termBannedVerId) {
    await db(
      `INSERT INTO clearance_dependencies (clearance_id, workspace_id, source_version_id, claim_id, link_status)
       VALUES ($1, $2, $3, NULL, 'confirmed')`,
      [clearanceId, wsId, termBannedVerId]
    );
  }

  // 5. Guideline tone dependency
  const toneVerId = srcMap.get('guideline_tone');
  if (toneVerId) {
    await db(
      `INSERT INTO clearance_dependencies (clearance_id, workspace_id, source_version_id, claim_id, link_status)
       VALUES ($1, $2, $3, NULL, 'confirmed')`,
      [clearanceId, wsId, toneVerId]
    );
  }
}

/**
 * Pre-seed Sample D (Festive Email) with an approved clearance and a confirmed dependency
 * on festive_discount v1. Allows demonstrating expiry / withdrawal in revalidation.
 */
async function seedSampleD(wsId: string): Promise<void> {
  const srcRows = await db<{ id: string; key: string }>(
    `SELECT sv.id, s.key FROM source_versions sv
     JOIN sources s ON s.id = sv.source_id
     WHERE s.workspace_id = $1 AND sv.status = 'current'`,
    [wsId]
  );
  const srcMap = new Map(srcRows.map(r => [r.key, r.id]));
  const discVerId = srcMap.get('festive_discount');
  if (!discVerId) return;

  const emailText = 'Festive offer: get 20% off annual plans on BrightDesk Pro. Offer ends 10 November.';
  const hash = 'sample-d-seed-hash';

  const contentRows = await db<{ id: string }>(
    `INSERT INTO contents (workspace_id, title, created_by)
     VALUES ($1, 'BrightDesk Festive Promo Email', 'seed')
     RETURNING id`,
    [wsId]
  );
  const contentId = contentRows[0].id;

  const verRows = await db<{ id: string }>(
    `INSERT INTO content_versions (
       content_id, workspace_id, version, text, file_hash, state, ai_available
     ) VALUES ($1, $2, 1, $3, $4, 'cleared', true)
     RETURNING id`,
    [contentId, wsId, emailText, hash]
  );
  const versionId = verRows[0].id;

  const claimRows = await db<{ id: string }>(
    `INSERT INTO claims (
       content_version_id, workspace_id, quote, start_idx, end_idx, fact_key, value, context
     ) VALUES ($1, $2, '20% off annual plans', 19, 40, 'festive_discount', $3, 'current')
     RETURNING id`,
    [versionId, wsId, JSON.stringify({ number: 20, unit: 'percent' })]
  );

  const clRows = await db<{ id: string }>(
    `INSERT INTO clearances (
       workspace_id, content_version_id, decision, state, reviewer, comment
     ) VALUES ($1, $2, 'approved', 'current', 'reviewer', 'Approved festive promo email')
     ON CONFLICT (content_version_id) DO UPDATE SET
       decision = EXCLUDED.decision,
       state = EXCLUDED.state,
       reviewer = EXCLUDED.reviewer,
       comment = EXCLUDED.comment,
       decided_at = NOW()
     RETURNING id`,
    [wsId, versionId]
  );
  const clearanceId = clRows[0].id;

  await db(
    `INSERT INTO clearance_dependencies (clearance_id, workspace_id, source_version_id, claim_id, link_status)
     VALUES ($1, $2, $3, $4, 'confirmed')`,
    [clearanceId, wsId, discVerId, claimRows[0].id]
  );
}

/**
 * Pre-seed Visual Asset Hero Banner with confirmed dependencies on brand_palette and contrast_threshold.
 * Allows demonstrating visual brand guideline updates in revalidation.
 */
async function seedSampleAsset(wsId: string): Promise<void> {
  const srcRows = await db<{ id: string; key: string }>(
    `SELECT sv.id, s.key FROM source_versions sv
     JOIN sources s ON s.id = sv.source_id
     WHERE s.workspace_id = $1 AND sv.status = 'current'`,
    [wsId]
  );
  const srcMap = new Map(srcRows.map(r => [r.key, r.id]));
  const palVerId = srcMap.get('brand_palette');
  const conVerId = srcMap.get('contrast_threshold');
  if (!palVerId && !conVerId) return;

  const assetText = 'Approved brand graphic asset: BrightDesk hero poster with brand palette and WCAG AA contrast.';
  const hash = 'sample-asset-seed-hash';

  const contentRows = await db<{ id: string }>(
    `INSERT INTO contents (workspace_id, title, created_by)
     VALUES ($1, 'BrightDesk Brand Hero Asset', 'seed')
     RETURNING id`,
    [wsId]
  );
  const contentId = contentRows[0].id;

  const verRows = await db<{ id: string }>(
    `INSERT INTO content_versions (
       content_id, workspace_id, version, text, file_hash, state, ai_available
     ) VALUES ($1, $2, 1, $3, $4, 'cleared', true)
     RETURNING id`,
    [contentId, wsId, assetText, hash]
  );
  const versionId = verRows[0].id;

  const clRows = await db<{ id: string }>(
    `INSERT INTO clearances (
       workspace_id, content_version_id, decision, state, reviewer, comment
     ) VALUES ($1, $2, 'approved', 'current', 'reviewer', 'Approved visual brand asset')
     ON CONFLICT (content_version_id) DO UPDATE SET
       decision = EXCLUDED.decision,
       state = EXCLUDED.state,
       reviewer = EXCLUDED.reviewer,
       comment = EXCLUDED.comment,
       decided_at = NOW()
     RETURNING id`,
    [wsId, versionId]
  );
  const clearanceId = clRows[0].id;

  if (palVerId) {
    await db(
      `INSERT INTO clearance_dependencies (clearance_id, workspace_id, source_version_id, claim_id, link_status)
       VALUES ($1, $2, $3, NULL, 'confirmed')`,
      [clearanceId, wsId, palVerId]
    );
  }
  if (conVerId) {
    await db(
      `INSERT INTO clearance_dependencies (clearance_id, workspace_id, source_version_id, claim_id, link_status)
       VALUES ($1, $2, $3, NULL, 'confirmed')`,
      [clearanceId, wsId, conVerId]
    );
  }
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
     ) VALUES ($1, $2, 'approved', 'current', 'reviewer', 'Pre-cleared historical case study')
     ON CONFLICT (content_version_id) DO UPDATE SET
       decision = EXCLUDED.decision,
       state = EXCLUDED.state,
       reviewer = EXCLUDED.reviewer,
       comment = EXCLUDED.comment,
       decided_at = NOW()`,
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

  // Pre-seed demo content covering all source types:
  // 1. Cleared promotional poster (dependencies on pro_price, trial_days, uptime_sla, term_banned_guaranteed, guideline_tone)
  // 2. Cleared festive promo email (dependencies on festive_discount, pro_price)
  // 3. Cleared brand hero asset (dependencies on brand_palette, contrast_threshold)
  // 4. Cleared historical case study without dependency (demonstrates selective unaffected status)
  await seedSampleA(wsId);
  await seedSampleD(wsId);
  await seedSampleAsset(wsId);
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

  // Pre-seed demo content
  await seedSampleA(wsId);
  await seedSampleD(wsId);
  await seedSampleAsset(wsId);
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
