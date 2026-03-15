/**
 * Persistent tip store backed by Neon Postgres.
 *
 * Drop-in replacement for the old in-memory Map store.
 * All function signatures are preserved.
 */

import { nanoid } from 'nanoid';
import { createPublicClient, http, type Address } from 'viem';
import { abstract } from 'viem/chains';
import { IDENTITY_REGISTRY_ABI } from '@/config/abi';
import { IDENTITY_REGISTRY_ADDRESS } from '@/config/contract';
import { ACK_TREASURY_ADDRESS } from '@/config/tokens';
import { getDb, ensureMigrations, hasDb } from './db';

export interface TipRecord {
  id: string;
  kudosTxHash: string;
  agentId: number;
  fromAddress: string;
  fromAgentId?: number;
  toAddress: string;
  amountUsd: number;
  amountRaw: bigint;
  status: 'pending' | 'completed' | 'expired';
  paymentTxHash?: string;
  createdAt: number;
  completedAt?: number;
  expiresAt: number;
}

/** Serializable version of TipRecord for JSON responses */
export interface TipRecordJSON {
  id: string;
  kudosTxHash: string;
  agentId: number;
  fromAddress: string;
  fromAgentId?: number;
  toAddress: string;
  amountUsd: number;
  amountRaw: string;
  status: 'pending' | 'completed' | 'expired';
  paymentTxHash?: string;
  createdAt: number;
  completedAt?: number;
  expiresAt: number;
}

const viemClient = createPublicClient({ chain: abstract, transport: http() });

/** Cached wallet-to-agentId mapping with 5-minute TTL */
let walletAgentCache: { map: Map<string, number>; expiresAt: number } | null =
  null;
const WALLET_CACHE_TTL_MS = 5 * 60 * 1000;

async function buildWalletAgentMap(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    const totalSupply = await viemClient.readContract({
      address: IDENTITY_REGISTRY_ADDRESS,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'totalSupply',
    });
    const count = Number(totalSupply);
    if (count === 0) return map;

    const ownerCalls = Array.from({ length: count }, (_, i) => ({
      address: IDENTITY_REGISTRY_ADDRESS,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'ownerOf' as const,
      args: [BigInt(i + 1)] as const,
    }));
    const walletCalls = Array.from({ length: count }, (_, i) => ({
      address: IDENTITY_REGISTRY_ADDRESS,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'getAgentWallet' as const,
      args: [BigInt(i + 1)] as const,
    }));

    const [ownerResults, walletResults] = await Promise.all([
      viemClient.multicall({ contracts: ownerCalls }),
      viemClient.multicall({ contracts: walletCalls }),
    ]);

    for (let i = 0; i < count; i++) {
      const tokenId = i + 1;
      const ownerRes = ownerResults[i];
      if (ownerRes.status === 'success' && ownerRes.result) {
        map.set((ownerRes.result as string).toLowerCase(), tokenId);
      }
      const walletRes = walletResults[i];
      if (walletRes.status === 'success' && walletRes.result) {
        map.set((walletRes.result as string).toLowerCase(), tokenId);
      }
    }
  } catch {
    // Registry read failed, return empty map
  }
  return map;
}

/**
 * Resolve a wallet address to an ERC-8004 agent ID.
 * Checks both owner addresses and agent wallets.
 * Results are cached for 5 minutes.
 */
export async function resolveAgentByWallet(
  address: string
): Promise<number | null> {
  if (!walletAgentCache || walletAgentCache.expiresAt <= Date.now()) {
    const map = await buildWalletAgentMap();
    walletAgentCache = { map, expiresAt: Date.now() + WALLET_CACHE_TTL_MS };
  }
  return walletAgentCache.map.get(address.toLowerCase()) ?? null;
}

/**
 * Resolve the payment address for an agent. Tries ownerOf from
 * the identity registry first, falls back to ACK_TREASURY_ADDRESS.
 */
export async function resolvePaymentAddress(agentId: number): Promise<Address> {
  try {
    const owner = await viemClient.readContract({
      address: IDENTITY_REGISTRY_ADDRESS,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'ownerOf',
      args: [BigInt(agentId)],
    });
    return owner as Address;
  } catch {
    return ACK_TREASURY_ADDRESS;
  }
}

/** 24 hours in milliseconds */
const TIP_TTL_MS = 24 * 60 * 60 * 1000;

/** Convert a DB row to a TipRecord */
function rowToTip(row: Record<string, unknown>): TipRecord {
  return {
    id: row.id as string,
    kudosTxHash: row.kudos_tx_hash as string,
    agentId: row.agent_id as number,
    fromAddress: row.from_address as string,
    toAddress: row.to_address as string,
    amountUsd: row.amount_usd as number,
    amountRaw: BigInt(Math.round((row.amount_usd as number) * 1e6)),
    status: row.status as TipRecord['status'],
    paymentTxHash: (row.payment_tx_hash as string) || undefined,
    createdAt: row.created_at as number,
    completedAt: (row.completed_at as number) || undefined,
    expiresAt: row.expires_at as number,
  };
}

/** Convert a TipRecord to a JSON-safe object (bigint -> string) */
export function tipToJSON(tip: TipRecord): TipRecordJSON {
  return {
    ...tip,
    amountRaw: tip.amountRaw.toString(),
  };
}

/** Convert USD amount to USDC raw units (6 decimals) */
export function usdToRaw(amountUsd: number): bigint {
  return BigInt(Math.round(amountUsd * 1e6));
}

/** Expire stale pending tips in the database. */
async function pruneExpired(): Promise<void> {
  await ensureMigrations();
  const sql = getDb();
  const now = Date.now();
  await sql`
    UPDATE tips SET status = 'expired'
    WHERE status = 'pending' AND expires_at <= ${now}
  `;
}

/** Create a new pending tip record. */
export async function createTip(params: {
  kudosTxHash: string;
  agentId: number;
  fromAddress: string;
  toAddress: string;
  amountUsd: number;
}): Promise<TipRecord> {
  const sql = getDb();
  await pruneExpired();

  const now = Date.now();
  const id = nanoid();

  await sql`
    INSERT INTO tips (id, kudos_tx_hash, agent_id, from_address, to_address, amount_usd, status, created_at, expires_at)
    VALUES (${id}, ${params.kudosTxHash}, ${params.agentId}, ${params.fromAddress.toLowerCase()}, ${params.toAddress.toLowerCase()}, ${params.amountUsd}, 'pending', ${now}, ${now + TIP_TTL_MS})
  `;

  return {
    id,
    kudosTxHash: params.kudosTxHash,
    agentId: params.agentId,
    fromAddress: params.fromAddress.toLowerCase(),
    toAddress: params.toAddress.toLowerCase(),
    amountUsd: params.amountUsd,
    amountRaw: usdToRaw(params.amountUsd),
    status: 'pending',
    createdAt: now,
    expiresAt: now + TIP_TTL_MS,
  };
}

/**
 * Look up a completed tip by the kudos transaction hash it was linked to.
 */
export async function getTipByKudosTxHash(
  kudosTxHash: string
): Promise<TipRecord | undefined> {
  if (!kudosTxHash || !hasDb()) return undefined;
  const sql = getDb();
  await pruneExpired();

  const hash = kudosTxHash.toLowerCase();
  const rows = await sql`
    SELECT * FROM tips
    WHERE status = 'completed'
      AND (LOWER(kudos_tx_hash) = ${hash} OR LOWER(payment_tx_hash) = ${hash})
    LIMIT 1
  `;

  if (rows.length === 0) return undefined;
  const tip = rowToTip(rows[0]);
  const fromAgentId = await resolveAgentByWallet(tip.fromAddress);
  if (fromAgentId !== null) tip.fromAgentId = fromAgentId;
  return tip;
}

/** Look up a tip by ID. */
export async function getTip(tipId: string): Promise<TipRecord | undefined> {
  const sql = getDb();
  await pruneExpired();

  const rows = await sql`SELECT * FROM tips WHERE id = ${tipId} LIMIT 1`;
  return rows.length > 0 ? rowToTip(rows[0]) : undefined;
}

/** Return all completed tips. */
export async function getCompletedTips(): Promise<TipRecord[]> {
  const sql = getDb();
  await pruneExpired();

  const rows =
    await sql`SELECT * FROM tips WHERE status = 'completed' ORDER BY completed_at DESC`;
  return rows.map(rowToTip);
}

/** Mark a pending tip as completed with a payment tx hash. */
export async function completeTip(
  tipId: string,
  paymentTxHash: string
): Promise<TipRecord | undefined> {
  const sql = getDb();
  await pruneExpired();

  const now = Date.now();
  const rows = await sql`
    UPDATE tips
    SET status = 'completed', payment_tx_hash = ${paymentTxHash}, completed_at = ${now}
    WHERE id = ${tipId} AND status = 'pending'
    RETURNING *
  `;

  return rows.length > 0 ? rowToTip(rows[0]) : undefined;
}
