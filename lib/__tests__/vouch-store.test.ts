import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('vouch-store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function getModule() {
    return import('../vouch-store');
  }

  function makeVouch(from = '0xSender') {
    return {
      from,
      category: 'reliability' as const,
      message: 'Great agent!',
      timestamp: new Date().toISOString(),
    };
  }

  describe('addVouch', () => {
    it('adds a vouch successfully', async () => {
      const { addVouch } = await getModule();
      const result = addVouch('0xTarget', makeVouch());
      expect(result.added).toBe(true);
      expect(result.count).toBe(1);
    });

    it('increments count for multiple vouches', async () => {
      const { addVouch } = await getModule();
      addVouch('0xTarget', makeVouch('0xA'));
      const result = addVouch('0xTarget', makeVouch('0xB'));
      expect(result.added).toBe(true);
      expect(result.count).toBe(2);
    });

    it('rejects when max vouches reached (10)', async () => {
      const { addVouch } = await getModule();
      for (let i = 0; i < 10; i++) {
        addVouch('0xTarget', makeVouch(`0x${i}`));
      }
      const result = addVouch('0xTarget', makeVouch('0xExtra'));
      expect(result.added).toBe(false);
      expect(result.count).toBe(10);
      expect(result.reason).toContain('10');
    });

    it('normalizes target address to lowercase', async () => {
      const { addVouch, getVouches } = await getModule();
      addVouch('0xABCD', makeVouch());
      const result = getVouches('0xabcd');
      expect(result.count).toBe(1);
    });
  });

  describe('getVouches', () => {
    it('returns empty for unknown address', async () => {
      const { getVouches } = await getModule();
      const result = getVouches('0xUnknown');
      expect(result.vouches).toEqual([]);
      expect(result.count).toBe(0);
    });

    it('returns all vouches for known address', async () => {
      const { addVouch, getVouches } = await getModule();
      addVouch('0xTarget', makeVouch('0xA'));
      addVouch('0xTarget', makeVouch('0xB'));
      const result = getVouches('0xTarget');
      expect(result.count).toBe(2);
      expect(result.vouches[0].from).toBe('0xA');
      expect(result.vouches[1].from).toBe('0xB');
    });
  });

  describe('clearVouches', () => {
    it('removes all vouches for a target', async () => {
      const { addVouch, clearVouches, getVouches } = await getModule();
      addVouch('0xTarget', makeVouch());
      clearVouches('0xTarget');
      expect(getVouches('0xTarget').count).toBe(0);
    });

    it('does not affect other targets', async () => {
      const { addVouch, clearVouches, getVouches } = await getModule();
      addVouch('0xA', makeVouch());
      addVouch('0xB', makeVouch());
      clearVouches('0xA');
      expect(getVouches('0xA').count).toBe(0);
      expect(getVouches('0xB').count).toBe(1);
    });
  });

  describe('TTL expiry', () => {
    it('prunes vouches older than 30 days', async () => {
      const { addVouch, getVouches } = await getModule();
      addVouch('0xTarget', makeVouch());
      expect(getVouches('0xTarget').count).toBe(1);

      // Advance 31 days
      vi.advanceTimersByTime(31 * 24 * 60 * 60 * 1000);

      expect(getVouches('0xTarget').count).toBe(0);
    });

    it('keeps vouches within 30 days', async () => {
      const { addVouch, getVouches } = await getModule();
      addVouch('0xTarget', makeVouch());

      // Advance 29 days
      vi.advanceTimersByTime(29 * 24 * 60 * 60 * 1000);

      expect(getVouches('0xTarget').count).toBe(1);
    });
  });
});
