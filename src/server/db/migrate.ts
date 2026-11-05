import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env.local' });

async function migrate(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL is not set in .env.local');
  }
  const client = neon(dbUrl);
  const schemaPath = path.join(process.cwd(), 'src', 'server', 'db', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  const cleanSql = schemaSql.replace(/\/\*[\s\S]*?\*\/|--.*$/gm, '');
  const statements = cleanSql
    .split(';')
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0);

  for (const stmt of statements) {
    await client.query(stmt);
  }
  console.log('✅ Migrations applied successfully.');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

