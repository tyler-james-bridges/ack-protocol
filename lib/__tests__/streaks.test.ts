import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the feedback-cache dependency
vi.mock('../feedback-cache', () => ({
  getAllFeedbackEvents: vi.fn().mockResolvedValue([]),
}));

describe('streaks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function getModules() {
    const feedbackCache = await import('../feedback-cache');
    const streaks = await import('../streaks');
    return { feedbackCache, streaks };
  }

  it('returns zero streak for no events', async () => {
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
    const { feedbackCache, streaks } = await getModules();
    vi.mocked(feedbackCache.getAllFeedbackEvents).mockResolvedValue([]);

    const result = await streaks.getStreakForAddress('0xABC');
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.lastKudosDate).toBeNull();
    expect(result.isActiveToday).toBe(false);
    expect(result.totalDaysActive).toBe(0);
  });

  it('computes streak from consecutive-day events', async () => {
    const now = new Date('2025-06-15T12:00:00Z');
    vi.setSystemTime(now);
    const currentTimestamp = Math.floor(now.getTime() / 1000);

    // Simulate events from today, yesterday, and day before
    // Block numbers: higher = more recent
    const { feedbackCache, streaks } = await getModules();
    const events = [
      {
        sender: '0xabc',
        agentId: 1,
        tag1: 'kudos',
        tag2: 'speed',
        feedbackURI: '',
        txHash: '0x1',
        blockNumber: '1000',
      },
      {
        sender: '0xabc',
        agentId: 2,
        tag1: 'kudos',
        tag2: 'speed',
        feedbackURI: '',
        txHash: '0x2',
        blockNumber: String(1000 - 86400),
      },
      {
        sender: '0xabc',
        agentId: 3,
        tag1: 'kudos',
        tag2: 'speed',
        feedbackURI: '',
        txHash: '0x3',
        blockNumber: String(1000 - 86400 * 2),
      },
    ];
    vi.mocked(feedbackCache.getAllFeedbackEvents).mockResolvedValue(
      events as never
    );

    const result = await streaks.getStreakForAddress('0xABC');
    expect(result.currentStreak).toBeGreaterThanOrEqual(1);
    expect(result.totalDaysActive).toBeGreaterThanOrEqual(1);
  });

  it('getTopStreakers returns sorted results', async () => {
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
    const { feedbackCache, streaks } = await getModules();

    // Create events for two senders with different activity levels
    const events = [
      {
        sender: '0xaaa',
        agentId: 1,
        tag1: 'kudos',
        tag2: 'speed',
        feedbackURI: '',
        txHash: '0x1',
        blockNumber: '1000',
      },
      {
        sender: '0xbbb',
        agentId: 2,
        tag1: 'kudos',
        tag2: 'speed',
        feedbackURI: '',
        txHash: '0x2',
        blockNumber: '1000',
      },
      {
        sender: '0xbbb',
        agentId: 3,
        tag1: 'kudos',
        tag2: 'speed',
        feedbackURI: '',
        txHash: '0x3',
        blockNumber: String(1000 - 86400),
      },
    ];
    vi.mocked(feedbackCache.getAllFeedbackEvents).mockResolvedValue(
      events as never
    );

    const top = await streaks.getTopStreakers(10);
    // Should return streakers sorted by current streak descending
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].streak.currentStreak).toBeGreaterThanOrEqual(
        top[i].streak.currentStreak
      );
    }
  });
});
