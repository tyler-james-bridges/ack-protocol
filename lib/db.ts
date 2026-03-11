import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let _sql: NeonQueryFunction<false, false> | null = null;
let _migrated = false;

export function getDb(): NeonQueryFunction<false, false> {
  if (!_sql) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL environment variable is not set. ' +
          'Set it in .env.local for local dev or in Vercel project settings.'
      );
    }
    _sql = neon(databaseUrl);
  }
  return _sql;
}

/** Returns true if DATABASE_URL is configured. */
export function hasDb(): boolean {
  return !!process.env.DATABASE_URL;
}

/** Run migrations once per cold start. */
export async function ensureMigrations(): Promise<void> {
  if (_migrated) return;
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS tips (
      id TEXT PRIMARY KEY,
      kudos_tx_hash TEXT NOT NULL DEFAULT '',
      agent_id INTEGER NOT NULL,
      from_address TEXT NOT NULL,
      to_address TEXT NOT NULL,
      amount_usd REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at BIGINT NOT NULL,
      expires_at BIGINT NOT NULL,
      completed_at BIGINT,
      payment_tx_hash TEXT
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_tips_kudos_tx ON tips (kudos_tx_hash)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tips_status ON tips (status)`;
  _migrated = true;
}
