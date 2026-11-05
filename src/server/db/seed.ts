/**
 * ProofGate seed script.
 * Run with: npm run seed
 * Seeds the BrightDesk demo workspace (7 sources from docs/SEED_DATA.md).
 * Note: customer_count is intentionally NOT seeded so claims about it → unverifiable.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { DEMO_WORKSPACE_NAME, SEED_SOURCES } from './seedData';

dotenv.config({ path: '.env.local' });

async function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.');
  }
  const _sql = neon(process.env.DATABASE_URL);
  return async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
    return _sql.query(text, params) as Promise<T[]>;
  };
}

async function applySchema(sql: <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T[]>): Promise<void> {
  const schemaPath = path.join(process.cwd(), 'src', 'server', 'db', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  // Strip block and line comments
  const cleanSql = schemaSql.replace(/\/\*[\s\S]*?\*\/|--.*$/gm, '');
  const statements = cleanSql
    .split(';')
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0);
  for (const stmt of statements) {
    await sql(stmt);
  }
  console.log('✓ Schema applied');
}


async function seedWorkspace(sql: <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T[]>): Promise<string> {
  const existing = await sql<{ id: string }>(
    `SELECT id FROM workspaces WHERE name = $1 LIMIT 1`,
    [DEMO_WORKSPACE_NAME]
  );
  if (existing.length > 0) {
    const wsId = existing[0].id;
    await sql(`DELETE FROM contents WHERE workspace_id = $1`, [wsId]);
    await sql(`DELETE FROM sources WHERE workspace_id = $1`, [wsId]);
    console.log(`✓ Wiped existing demo workspace ${wsId}`);
    return wsId;
  }
  const rows = await sql<{ id: string }>(
    `INSERT INTO workspaces (name) VALUES ($1) RETURNING id`,
    [DEMO_WORKSPACE_NAME]
  );
  const wsId = rows[0].id;
  console.log(`✓ Created demo workspace ${wsId}`);
  return wsId;
}

async function seedSources(sql: <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T[]>, wsId: string): Promise<void> {
  for (const s of SEED_SOURCES) {
    const sourceRows = await sql<{ id: string }>(
      `INSERT INTO sources (workspace_id, kind, key, title, owner)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (workspace_id, key) DO UPDATE SET title = EXCLUDED.title
       RETURNING id`,
      [wsId, s.kind, s.key, s.title, s.owner]
    );
    const sourceId = sourceRows[0].id;
    await sql(
      `INSERT INTO source_versions (source_id, workspace_id, version, value, status, valid_until, created_by)
       VALUES ($1, $2, 1, $3, 'current', $4, 'seed')
       ON CONFLICT (source_id, version) DO NOTHING`,
      [sourceId, wsId, JSON.stringify(s.value), s.validUntil]
    );
  }
  console.log(`✓ Seeded ${SEED_SOURCES.length} sources`);
}

async function main(): Promise<void> {
  console.log('🌱 ProofGate seed starting…');
  const sql = await getSql();
  await applySchema(sql);
  const wsId = await seedWorkspace(sql);
  await seedSources(sql, wsId);
  console.log('✅ Seed complete. Demo workspace ready.');
  process.exit(0);
}

if (require.main === module || process.argv[1]?.includes('seed.ts')) {
  main().catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
