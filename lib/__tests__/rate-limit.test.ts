import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('rate-limit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function getModule() {
    return import('../rate-limit');
  }

  describe('checkRateLimit', () => {
    it('allows the first request', async () => {
      const { checkRateLimit } = await getModule();
      const result = checkRateLimit('0xABC');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('decrements remaining on each request', async () => {
      const { checkRateLimit } = await getModule();
      checkRateLimit('0xABC');
      const result = checkRateLimit('0xABC');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(8);
    });

    it('blocks after 10 requests', async () => {
      const { checkRateLimit } = await getModule();
      for (let i = 0; i < 10; i++) {
        checkRateLimit('0xABC');
      }
      const result = checkRateLimit('0xABC');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('is case-insensitive', async () => {
      const { checkRateLimit } = await getModule();
      checkRateLimit('0xABC');
      const result = checkRateLimit('0xabc');
      expect(result.remaining).toBe(8);
    });

    it('tracks different keys independently', async () => {
      const { checkRateLimit } = await getModule();
      for (let i = 0; i < 10; i++) {
        checkRateLimit('0xABC');
      }
      const result = checkRateLimit('0xDEF');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('resets after the window expires', async () => {
      const { checkRateLimit } = await getModule();
      for (let i = 0; i < 10; i++) {
        checkRateLimit('0xABC');
      }
      expect(checkRateLimit('0xABC').allowed).toBe(false);

      // Advance past 1-hour window
      vi.advanceTimersByTime(60 * 60 * 1000 + 1);

      const result = checkRateLimit('0xABC');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('sets resetAt to oldest timestamp + window', async () => {
      const { checkRateLimit } = await getModule();
      const now = Date.now();
      const result = checkRateLimit('0xABC');
      expect(result.resetAt).toBeGreaterThanOrEqual(now + 60 * 60 * 1000);
    });
  });

  describe('RateLimiter', () => {
    it('respects custom window and max', async () => {
      const { RateLimiter } = await getModule();
      const limiter = new RateLimiter({ windowMs: 10_000, maxRequests: 3 });

      expect(limiter.check('key1').allowed).toBe(true);
      expect(limiter.check('key1').allowed).toBe(true);
      expect(limiter.check('key1').allowed).toBe(true);
      expect(limiter.check('key1').allowed).toBe(false);
    });

    it('resets after custom window expires', async () => {
      const { RateLimiter } = await getModule();
      const limiter = new RateLimiter({ windowMs: 5_000, maxRequests: 2 });

      limiter.check('k');
      limiter.check('k');
      expect(limiter.check('k').allowed).toBe(false);

      vi.advanceTimersByTime(5_001);
      expect(limiter.check('k').allowed).toBe(true);
    });

    it('is case-insensitive on keys', async () => {
      const { RateLimiter } = await getModule();
      const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 2 });

      limiter.check('KEY');
      const result = limiter.check('key');
      expect(result.remaining).toBe(0);
    });

    it('returns correct remaining count', async () => {
      const { RateLimiter } = await getModule();
      const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 5 });

      expect(limiter.check('a').remaining).toBe(4);
      expect(limiter.check('a').remaining).toBe(3);
      expect(limiter.check('a').remaining).toBe(2);
      expect(limiter.check('a').remaining).toBe(1);
      expect(limiter.check('a').remaining).toBe(0);
    });
  });
});
