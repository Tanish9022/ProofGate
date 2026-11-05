import { neon } from '@neondatabase/serverless';

let _sql: ReturnType<typeof neon> | null = null;

function getSql() {
  if (!_sql) {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    _sql = neon(dbUrl);
  }
  return _sql;
}

/**
 * Run a parameterised SQL query using the Neon serverless driver.
 * Uses lazy connection so next build doesn't throw during static analysis if DATABASE_URL is missing.
 */
export async function db<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const sql = getSql();
  const rows = await sql.query(text, params);
  return rows as T[];
}
