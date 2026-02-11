/**
 * Per-agent rate limiter — sliding window, 10 kudos/agent/hour.
 *
 * MVP: in-memory Map. Works for single-instance dev.
 * Production: swap to Upstash Redis ratelimit or Vercel KV.
 */

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 10;

const windows = new Map<string, number[]>();

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/** Check and record a request for an agent address. */
export function checkRateLimit(agentAddress: string): RateLimitResult {
  const key = agentAddress.toLowerCase();
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  // Get existing timestamps, filter to current window
  const timestamps = (windows.get(key) || []).filter((t) => t > windowStart);

  if (timestamps.length >= MAX_REQUESTS) {
    const oldestInWindow = timestamps[0];
    return {
      allowed: false,
      remaining: 0,
      resetAt: oldestInWindow + WINDOW_MS,
    };
  }

  timestamps.push(now);
  windows.set(key, timestamps);

  return {
    allowed: true,
    remaining: MAX_REQUESTS - timestamps.length,
    resetAt: timestamps[0] + WINDOW_MS,
  };
}

/** Periodic cleanup of stale windows. */
export function pruneWindows(): void {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [key, timestamps] of windows) {
    const active = timestamps.filter((t) => t > cutoff);
    if (active.length === 0) windows.delete(key);
    else windows.set(key, active);
  }
}

if (typeof globalThis !== 'undefined') {
  setInterval(pruneWindows, 5 * 60_000);
}
