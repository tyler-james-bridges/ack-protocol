/**
 * Per-agent rate limiter — sliding window, 10 kudos/agent/hour.
 *
 * Uses on-demand pruning instead of setInterval to avoid timer leaks
 * in serverless environments.
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

/** Prune stale windows. Called on each check. */
function pruneWindows(): void {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [key, timestamps] of windows) {
    const active = timestamps.filter((t) => t > cutoff);
    if (active.length === 0) windows.delete(key);
    else windows.set(key, active);
  }
}

/** Check and record a request for an agent address. */
export function checkRateLimit(agentAddress: string): RateLimitResult {
  pruneWindows();

  const key = agentAddress.toLowerCase();
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

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

/**
 * Configurable rate limiter — sliding window with custom limits.
 * Use for API endpoints that need different thresholds than the default.
 *
 * Uses on-demand pruning to avoid timer leaks in serverless environments.
 */
export class RateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private windows = new Map<string, number[]>();

  constructor(opts: { windowMs: number; maxRequests: number }) {
    this.windowMs = opts.windowMs;
    this.maxRequests = opts.maxRequests;
  }

  check(key: string): RateLimitResult {
    this.prune();

    const k = key.toLowerCase();
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const timestamps = (this.windows.get(k) || []).filter(
      (t) => t > windowStart
    );

    if (timestamps.length >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: timestamps[0] + this.windowMs,
      };
    }

    timestamps.push(now);
    this.windows.set(k, timestamps);

    return {
      allowed: true,
      remaining: this.maxRequests - timestamps.length,
      resetAt: timestamps[0] + this.windowMs,
    };
  }

  private prune(): void {
    const cutoff = Date.now() - this.windowMs;
    for (const [key, timestamps] of this.windows) {
      const active = timestamps.filter((t) => t > cutoff);
      if (active.length === 0) this.windows.delete(key);
      else this.windows.set(key, active);
    }
  }
}
