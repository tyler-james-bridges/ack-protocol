import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createChallenge, getChallenge, markClaimed } from '../claim-store';

describe('ClaimStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('createChallenge', () => {
    it('creates valid challenge with ack-claim-XXXXXX pattern', () => {
      const result = createChallenge('TestHandle', '0x123ABC', 42);

      expect(result.challenge).toMatch(/^ack-claim-[a-f0-9]{6}$/);
    });

    it('normalizes handle to lowercase', () => {
      createChallenge('TestHandle', '0x123ABC', 42);
      const entry = getChallenge('testhandle');

      expect(entry).not.toBeNull();
      expect(entry?.handle).toBe('testhandle');
    });

    it('normalizes wallet address to lowercase', () => {
      createChallenge('testhandle', '0x123ABC', 42);
      const entry = getChallenge('testhandle');

      expect(entry?.walletAddress).toBe('0x123abc');
    });

    it('sets expiresAt to 15 minutes from now', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const result = createChallenge('testhandle', '0x123abc', 42);
      const fifteenMinutes = 15 * 60 * 1000;

      expect(result.expiresAt).toBe(now + fifteenMinutes);
    });

    it('overwrites previous challenge for same handle', () => {
      const firstResult = createChallenge('testhandle', '0x123abc', 42);
      const secondResult = createChallenge('testhandle', '0x456def', 99);

      expect(firstResult.challenge).not.toBe(secondResult.challenge);

      const entry = getChallenge('testhandle');
      expect(entry?.challenge).toBe(secondResult.challenge);
      expect(entry?.walletAddress).toBe('0x456def');
      expect(entry?.agentId).toBe(99);
    });

    it('creates entry with pending status', () => {
      createChallenge('testhandle', '0x123abc', 42);
      const entry = getChallenge('testhandle');

      expect(entry?.status).toBe('pending');
      expect(entry?.txHash).toBeUndefined();
    });
  });

  describe('getChallenge', () => {
    it('returns entry for existing handle', () => {
      const { challenge } = createChallenge('testhandle', '0x123abc', 42);
      const entry = getChallenge('testhandle');

      expect(entry).not.toBeNull();
      expect(entry?.challenge).toBe(challenge);
      expect(entry?.handle).toBe('testhandle');
      expect(entry?.walletAddress).toBe('0x123abc');
      expect(entry?.agentId).toBe(42);
    });

    it('returns null for unknown handle', () => {
      const entry = getChallenge('nonexistent');

      expect(entry).toBeNull();
    });

    it('performs case-insensitive lookup', () => {
      createChallenge('TestHandle', '0x123abc', 42);

      expect(getChallenge('testhandle')).not.toBeNull();
      expect(getChallenge('TESTHANDLE')).not.toBeNull();
      expect(getChallenge('TestHandle')).not.toBeNull();
      expect(getChallenge('tEsThAnDlE')).not.toBeNull();
    });

    it('returns null for expired challenge', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      createChallenge('testhandle', '0x123abc', 42);

      // Advance time past 15 minute TTL
      const fifteenMinutesPlus = 15 * 60 * 1000 + 1000;
      vi.advanceTimersByTime(fifteenMinutesPlus);

      const entry = getChallenge('testhandle');
      expect(entry).toBeNull();
    });

    it('returns entry when within TTL', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      createChallenge('testhandle', '0x123abc', 42);

      // Advance time to just before expiry
      const fourteenMinutes = 14 * 60 * 1000;
      vi.advanceTimersByTime(fourteenMinutes);

      const entry = getChallenge('testhandle');
      expect(entry).not.toBeNull();
      expect(entry?.handle).toBe('testhandle');
    });

    it('does not prune claimed entries even after TTL', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      createChallenge('testhandle', '0x123abc', 42);
      markClaimed('testhandle', '0xdeadbeef');

      // Advance time past 15 minute TTL
      const fifteenMinutesPlus = 15 * 60 * 1000 + 1000;
      vi.advanceTimersByTime(fifteenMinutesPlus);

      const entry = getChallenge('testhandle');
      expect(entry).not.toBeNull();
      expect(entry?.status).toBe('claimed');
      expect(entry?.txHash).toBe('0xdeadbeef');
    });
  });

  describe('markClaimed', () => {
    it('sets status to claimed and stores txHash', () => {
      createChallenge('testhandle', '0x123abc', 42);
      markClaimed('testhandle', '0xdeadbeef');

      const entry = getChallenge('testhandle');
      expect(entry?.status).toBe('claimed');
      expect(entry?.txHash).toBe('0xdeadbeef');
    });

    it('is case-insensitive for handle lookup', () => {
      createChallenge('TestHandle', '0x123abc', 42);
      markClaimed('testhandle', '0xdeadbeef');

      const entry = getChallenge('TestHandle');
      expect(entry?.status).toBe('claimed');
      expect(entry?.txHash).toBe('0xdeadbeef');
    });

    it('is no-op if handle does not exist', () => {
      expect(() => markClaimed('nonexistent', '0xdeadbeef')).not.toThrow();
    });

    it('can be called multiple times to update txHash', () => {
      createChallenge('testhandle', '0x123abc', 42);
      markClaimed('testhandle', '0xfirst');
      markClaimed('testhandle', '0xsecond');

      const entry = getChallenge('testhandle');
      expect(entry?.txHash).toBe('0xsecond');
    });
  });

  describe('pruning behavior', () => {
    it('prunes expired pending entries on createChallenge', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      createChallenge('handle1', '0x123abc', 42);
      createChallenge('handle2', '0x456def', 99);

      // Advance time past TTL
      const sixteenMinutes = 16 * 60 * 1000;
      vi.advanceTimersByTime(sixteenMinutes);

      // Creating new challenge should prune expired ones
      createChallenge('handle3', '0x789ghi', 77);

      expect(getChallenge('handle1')).toBeNull();
      expect(getChallenge('handle2')).toBeNull();
      expect(getChallenge('handle3')).not.toBeNull();
    });

    it('prunes expired pending entries on getChallenge', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      createChallenge('testhandle', '0x123abc', 42);

      // Advance time past TTL
      const sixteenMinutes = 16 * 60 * 1000;
      vi.advanceTimersByTime(sixteenMinutes);

      // First call to getChallenge should trigger pruning
      expect(getChallenge('testhandle')).toBeNull();

      // Second call should still return null (entry was pruned)
      expect(getChallenge('testhandle')).toBeNull();
    });

    it('prunes expired pending entries on markClaimed', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      createChallenge('expired', '0x123abc', 42);

      // Advance time past TTL for first entry
      const sixteenMinutes = 16 * 60 * 1000;
      vi.advanceTimersByTime(sixteenMinutes);

      // Create a fresh entry that won't be expired
      createChallenge('active', '0x456def', 99);

      // Mark active as claimed - this should prune expired entry
      markClaimed('active', '0xdeadbeef');

      expect(getChallenge('expired')).toBeNull();
      expect(getChallenge('active')).not.toBeNull();
      expect(getChallenge('active')?.status).toBe('claimed');
    });
  });
});
