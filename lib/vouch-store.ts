/**
 * In-memory pending vouch store.
 *
 * Stores vouches from registered agents directed at unregistered addresses.
 * When the target eventually registers (via /api/onboard), the pending
 * vouches are surfaced as a welcome incentive.
 *
 * MVP: in-memory Map. Works for single-instance dev.
 * Production: swap to Upstash Redis or Vercel KV.
 */

import type { KudosCategory } from '@/config/contract';

export interface PendingVouch {
  from: string;
  category: KudosCategory;
  message: string;
  timestamp: string;
}

/** Max pending vouches stored per target address */
const MAX_VOUCHES_PER_TARGET = 10;

/** Vouch TTL — 30 days in ms */
const VOUCH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Map keyed by lowercase target address.
 * Each entry holds an array of pending vouches.
 */
const store = new Map<string, PendingVouch[]>();

/** Add a pending vouch for a target address. */
export function addVouch(
  targetAddress: string,
  vouch: PendingVouch
): { added: boolean; count: number; reason?: string } {
  const key = targetAddress.toLowerCase();
  const existing = store.get(key) || [];

  if (existing.length >= MAX_VOUCHES_PER_TARGET) {
    return {
      added: false,
      count: existing.length,
      reason: `Target already has ${MAX_VOUCHES_PER_TARGET} pending vouches`,
    };
  }

  existing.push(vouch);
  store.set(key, existing);

  return { added: true, count: existing.length };
}

/** Get all pending vouches for a target address. */
export function getVouches(targetAddress: string): {
  vouches: PendingVouch[];
  count: number;
} {
  const key = targetAddress.toLowerCase();
  const vouches = store.get(key) || [];
  return { vouches, count: vouches.length };
}

/** Remove all pending vouches for a target (e.g. after registration). */
export function clearVouches(targetAddress: string): void {
  store.delete(targetAddress.toLowerCase());
}

/** Periodic cleanup of expired vouches (older than TTL). */
function pruneExpiredVouches(): void {
  const cutoff = new Date(Date.now() - VOUCH_TTL_MS).toISOString();

  for (const [key, vouches] of store) {
    const active = vouches.filter((v) => v.timestamp > cutoff);
    if (active.length === 0) store.delete(key);
    else store.set(key, active);
  }
}

if (typeof globalThis !== 'undefined') {
  setInterval(pruneExpiredVouches, 10 * 60_000);
}
