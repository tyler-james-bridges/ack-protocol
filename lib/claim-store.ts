/**
 * In-memory claim challenge store.
 *
 * Stores pending handle-claim challenges. A user requests a challenge code,
 * tweets it from their X handle, and the twitter-agent verifies + submits
 * the claim onchain.
 *
 * MVP: in-memory Map. Works for single-instance dev.
 * Production: swap to Upstash Redis or Vercel KV.
 */

import { randomBytes } from 'crypto';

export interface ClaimEntry {
  handle: string;
  walletAddress: string;
  agentId: number;
  challenge: string;
  status: 'pending' | 'claimed';
  txHash?: string;
  createdAt: number;
}

/** Challenge TTL — 15 minutes in ms */
const CLAIM_TTL_MS = 15 * 60 * 1000;

/** Map keyed by lowercase handle */
const store = new Map<string, ClaimEntry>();

/** Prune expired challenges. Called on each read/write. */
function pruneExpired(): void {
  const cutoff = Date.now() - CLAIM_TTL_MS;
  for (const [key, entry] of store) {
    if (entry.status === 'pending' && entry.createdAt < cutoff) {
      store.delete(key);
    }
  }
}

/** Create a new claim challenge for a handle. */
export function createChallenge(
  handle: string,
  walletAddress: string,
  agentId: number
): { challenge: string; expiresAt: number } {
  pruneExpired();

  const key = handle.toLowerCase();
  const challenge = `ack-claim-${randomBytes(3).toString('hex')}`;
  const now = Date.now();

  store.set(key, {
    handle: key,
    walletAddress: walletAddress.toLowerCase(),
    agentId,
    challenge,
    status: 'pending',
    createdAt: now,
  });

  return { challenge, expiresAt: now + CLAIM_TTL_MS };
}

/** Get a pending or claimed challenge for a handle. */
export function getChallenge(handle: string): ClaimEntry | null {
  pruneExpired();
  return store.get(handle.toLowerCase()) || null;
}

/** Mark a challenge as claimed with its transaction hash. */
export function markClaimed(handle: string, txHash: string): void {
  pruneExpired();
  const entry = store.get(handle.toLowerCase());
  if (entry) {
    entry.status = 'claimed';
    entry.txHash = txHash;
  }
}
