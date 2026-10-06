import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { CLAWDIA_BASE_TIP_BACKFILL } from '@/lib/payments/x402-backfill';

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
      chain_id INTEGER NOT NULL DEFAULT 8453,
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
  await sql`ALTER TABLE tips ADD COLUMN IF NOT EXISTS chain_id INTEGER NOT NULL DEFAULT 8453`;
  await sql`ALTER TABLE tips ALTER COLUMN chain_id SET DEFAULT 8453`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tips_kudos_tx ON tips (kudos_tx_hash)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tips_status ON tips (status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tips_agent_chain ON tips (agent_id, chain_id)`;
  const backfill = CLAWDIA_BASE_TIP_BACKFILL;
  await sql`
    UPDATE tips
    SET payment_tx_hash = ${backfill.txHash}
    WHERE id = ${backfill.tipId}
      AND status = 'completed'
      AND payment_tx_hash = ${backfill.placeholder}
      AND agent_id = ${backfill.agentId}
      AND chain_id = ${backfill.chainId}
      AND amount_usd = ${backfill.amountUsd}
      AND LOWER(from_address) = ${backfill.fromAddress}
      AND LOWER(to_address) = ${backfill.toAddress}
  `;
  _migrated = true;
}
