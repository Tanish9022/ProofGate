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

  const executeSql = async (sql: string, label: string): Promise<void> => {
    const cleanSql = sql.replace(/\/\*[\s\S]*?\*\/|--.*$/gm, '');
    const statements = cleanSql
      .split(';')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    for (const stmt of statements) {
      await client.query(stmt);
    }
    console.log(`✅ Applied ${label}`);
  };

  // 1. Run base schema
  const schemaPath = path.join(process.cwd(), 'src', 'server', 'db', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    await executeSql(schemaSql, 'base schema.sql');
  }

  // 2. Run incremental migrations in order
  const migrationsDir = path.join(process.cwd(), 'src', 'server', 'db', 'migrations');
  if (fs.existsSync(migrationsDir)) {
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');
      await executeSql(sql, `migration ${file}`);
    }
  }

  console.log('✅ All migrations applied successfully.');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
