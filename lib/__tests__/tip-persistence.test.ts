import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

let directory: string;
let postgres: PGlite;

vi.mock('@neondatabase/serverless', () => ({
  neon:
    () =>
    async (query: TemplateStringsArray, ...values: unknown[]) =>
      (await postgres.sql(query, ...values)).rows,
}));

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'ack-tip-postgres-'));
  postgres = await PGlite.create(directory);
  vi.stubEnv('DATABASE_URL', 'postgresql://unused.invalid/tips');
  vi.resetModules();
}, 30_000);

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await postgres.close();
  await rm(directory, { recursive: true, force: true });
});

const tipInput = {
  kudosTxHash: '0xkudos',
  agentId: 7,
  fromAddress: '0xFrom',
  toAddress: '0xTo',
  amountUsd: 15.75,
};

async function insertWithoutChain(id: string) {
  await postgres.sql`
    INSERT INTO tips (id, agent_id, from_address, to_address, amount_usd, created_at, expires_at)
    VALUES (${id}, 7, '0xfrom', '0xto', 1, 0, 4102444800000)
  `;
}

it('keeps pre-chain tips on Abstract and defaults new rows to Base across migrations', async () => {
  await postgres.exec(`
    CREATE TABLE tips (
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
  `);
  await insertWithoutChain('abstract-era');

  const { ensureMigrations } = await import('../db');
  await ensureMigrations();
  await insertWithoutChain('base-era');
  const { createTip } = await import('../tip-store');
  const assigned = await createTip({ ...tipInput, chainId: 1 });

  vi.resetModules();
  const { getTip } = await import('../tip-store');
  expect((await getTip('abstract-era'))?.chainId).toBe(2741);
  expect((await getTip('base-era'))?.chainId).toBe(8453);
  expect((await getTip(assigned.id))?.chainId).toBe(1);
});

it('reads a tip with its chosen chain, normalized addresses and amount after reopening the database', async () => {
  const { createTip } = await import('../tip-store');
  const tip = await createTip({ ...tipInput, chainId: 2741 });

  await postgres.close();
  postgres = await PGlite.create(directory);
  vi.resetModules();
  const { getTip } = await import('../tip-store');
  expect(await getTip(tip.id)).toMatchObject({
    id: tip.id,
    kudosTxHash: tipInput.kudosTxHash,
    chainId: 2741,
    agentId: tipInput.agentId,
    fromAddress: '0xfrom',
    toAddress: '0xto',
    amountUsd: 15.75,
    amountRaw: BigInt(15750000),
    status: 'pending',
  });
}, 30_000);

it('lists only completed tips, newest completion first', async () => {
  const { createTip, completeTip, getCompletedTips } =
    await import('../tip-store');
  expect(await getCompletedTips()).toEqual([]);
  await createTip(tipInput);
  const older = await createTip({ ...tipInput, amountUsd: 10 });
  const newer = await createTip({ ...tipInput, amountUsd: 20 });

  const start = Date.now();
  const clock = vi.spyOn(Date, 'now').mockReturnValue(start);
  await completeTip(older.id, '0xolder');
  clock.mockReturnValue(start + 1000);
  await completeTip(newer.id, '0xnewer');

  const completed = await getCompletedTips();
  expect(completed.map(({ id, amountRaw }) => [id, amountRaw])).toEqual([
    [newer.id, BigInt(20000000)],
    [older.id, BigInt(10000000)],
  ]);
});
