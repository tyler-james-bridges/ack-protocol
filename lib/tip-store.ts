/**
 * In-memory tip store for tipped kudos.
 *
 * Stores pending USDC tip records linked to kudos transactions.
 * MVP: in-memory Map. Will swap to SQLite/Turso for production.
 */

import { nanoid } from 'nanoid';
import { createPublicClient, http, type Address } from 'viem';
import { abstract } from 'viem/chains';
import { IDENTITY_REGISTRY_ABI } from '@/config/abi';
import { IDENTITY_REGISTRY_ADDRESS } from '@/config/contract';
import { ACK_TREASURY_ADDRESS } from '@/config/tokens';

export interface TipRecord {
  id: string;
  kudosTxHash: string;
  agentId: number;
  fromAddress: string;
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
  toAddress: string;
  amountUsd: number;
  amountRaw: string;
  status: 'pending' | 'completed' | 'expired';
  paymentTxHash?: string;
  createdAt: number;
  completedAt?: number;
  expiresAt: number;
}

const client = createPublicClient({ chain: abstract, transport: http() });

/**
 * Resolve the payment address for an agent. Tries ownerOf from
 * the identity registry first, falls back to ACK_TREASURY_ADDRESS.
 */
export async function resolvePaymentAddress(agentId: number): Promise<Address> {
  try {
    const owner = await client.readContract({
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

const store = new Map<string, TipRecord>();

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

/** Expire stale pending tips. Called on reads/writes. */
function pruneExpired(): void {
  const now = Date.now();
  for (const [id, tip] of store) {
    if (tip.status === 'pending' && tip.expiresAt <= now) {
      store.set(id, { ...tip, status: 'expired' });
    }
  }
}

/** Create a new pending tip record. */
export function createTip(params: {
  kudosTxHash: string;
  agentId: number;
  fromAddress: string;
  toAddress: string;
  amountUsd: number;
}): TipRecord {
  pruneExpired();

  const now = Date.now();
  const tip: TipRecord = {
    id: nanoid(),
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

  store.set(tip.id, tip);
  return tip;
}

/** Look up a tip by ID. Returns undefined if not found. */
/**
 * Look up a completed tip by the kudos transaction hash it was linked to.
 * Returns the tip amount in USD or undefined if no tip exists.
 */
export function getTipByKudosTxHash(
  kudosTxHash: string
): TipRecord | undefined {
  if (!kudosTxHash) return undefined;
  pruneExpired();
  const hash = kudosTxHash.toLowerCase();
  for (const tip of store.values()) {
    if (tip.status === 'completed' && tip.kudosTxHash.toLowerCase() === hash) {
      return tip;
    }
    if (
      tip.status === 'completed' &&
      tip.paymentTxHash?.toLowerCase() === hash
    ) {
      return tip;
    }
  }
  return undefined;
}

export function getTip(tipId: string): TipRecord | undefined {
  pruneExpired();
  return store.get(tipId);
}

/** Mark a pending tip as completed with a payment tx hash. */
export function completeTip(
  tipId: string,
  paymentTxHash: string
): TipRecord | undefined {
  pruneExpired();

  const tip = store.get(tipId);
  if (!tip || tip.status !== 'pending') return undefined;

  const updated: TipRecord = {
    ...tip,
    status: 'completed',
    paymentTxHash,
    completedAt: Date.now(),
  };

  store.set(tipId, updated);
  return updated;
}
