import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQueryKudosFeed = vi.fn();
const mockQueryKudosDetail = vi.fn();
const mockQueryTipFeed = vi.fn();
const mockQueryTipStats = vi.fn();
const mockQueryStreaks = vi.fn();
const mockQueryVouch = vi.fn();

vi.mock('./kudos-queries', () => ({
  queryKudosFeed: (...args: unknown[]) => mockQueryKudosFeed(...args),
  queryKudosDetail: (...args: unknown[]) => mockQueryKudosDetail(...args),
  queryTipFeed: (...args: unknown[]) => mockQueryTipFeed(...args),
  queryTipStats: (...args: unknown[]) => mockQueryTipStats(...args),
  queryStreaks: (...args: unknown[]) => mockQueryStreaks(...args),
  queryVouch: (...args: unknown[]) => mockQueryVouch(...args),
}));

import { handleKudosTool } from './kudos-handler';

describe('handleKudosTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a missing body', async () => {
    const result = await handleKudosTool(null);
    expect(result.status).toBe(400);
    expect(result.body.error).toContain('JSON object');
  });

  it('rejects a missing action', async () => {
    const result = await handleKudosTool({});
    expect(result.status).toBe(400);
    expect(result.body.error).toContain('action is required');
  });

  it('rejects an unknown action', async () => {
    const result = await handleKudosTool({ action: 'reputation' });
    expect(result.status).toBe(400);
    expect(result.body.error).toContain('Invalid action');
  });

  it('rejects a limit outside 1-50', async () => {
    const result = await handleKudosTool({ action: 'kudos_feed', limit: 99 });
    expect(result.status).toBe(400);
    expect(result.body.error).toContain('limit');
  });

  it('returns a kudos feed', async () => {
    mockQueryKudosFeed.mockResolvedValue({
      items: [{ txHash: '0x1', agentId: 1 }],
      total: 1,
    });
    const result = await handleKudosTool({
      action: 'kudos_feed',
      agentId: 1,
      limit: 5,
    });
    expect(result.status).toBe(200);
    expect(result.body.total).toBe(1);
    expect(mockQueryKudosFeed).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: 1, limit: 5 })
    );
  });

  it('requires txHash for kudos_detail', async () => {
    const result = await handleKudosTool({ action: 'kudos_detail' });
    expect(result.status).toBe(400);
    expect(result.body.error).toContain('txHash');
  });

  it('returns kudos detail on success', async () => {
    mockQueryKudosDetail.mockResolvedValue({
      ok: true,
      kudos: { txHash: '0xabc', agentId: 606 },
    });
    const result = await handleKudosTool({
      action: 'kudos_detail',
      txHash: '0xabc',
    });
    expect(result.status).toBe(200);
    expect(result.body.kudos).toEqual({ txHash: '0xabc', agentId: 606 });
  });

  it('forwards kudos_detail lookup errors', async () => {
    mockQueryKudosDetail.mockResolvedValue({
      ok: false,
      status: 404,
      error: 'No feedback event in this transaction',
    });
    const result = await handleKudosTool({
      action: 'kudos_detail',
      txHash:
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    });
    expect(result.status).toBe(404);
    expect(result.body.error).toContain('No feedback event');
  });

  it('returns a tip feed', async () => {
    mockQueryTipFeed.mockResolvedValue({
      ok: true,
      items: [{ tipId: 't1', agentId: 606 }],
    });
    const result = await handleKudosTool({ action: 'tip_feed', agentId: 606 });
    expect(result.status).toBe(200);
    expect(result.body.items).toHaveLength(1);
  });

  it('returns tip stats', async () => {
    mockQueryTipStats.mockResolvedValue({
      ok: true,
      stats: {
        received: [],
        given: [],
        totalReceived: 0,
        totalGiven: 2,
        countReceived: 0,
        countGiven: 1,
      },
    });
    const result = await handleKudosTool({
      action: 'tip_stats',
      wallet: '0x668aDd9213985E7Fd613Aec87767C892f4b9dF1c',
    });
    expect(result.status).toBe(200);
    expect(result.body.totalGiven).toBe(2);
  });

  it('requires address for streaks', async () => {
    const result = await handleKudosTool({ action: 'streaks' });
    expect(result.status).toBe(400);
    expect(result.body.error).toContain('address is required');
  });

  it('returns streak data', async () => {
    mockQueryStreaks.mockResolvedValue({
      ok: true,
      address: '0x668add9213985e7fd613aec87767c892f4b9df1c',
      streak: { currentStreak: 2 },
    });
    const result = await handleKudosTool({
      action: 'streaks',
      address: '0x668aDd9213985E7Fd613Aec87767C892f4b9dF1c',
    });
    expect(result.status).toBe(200);
    expect(result.body.streak).toEqual({ currentStreak: 2 });
  });

  it('requires address for vouch', async () => {
    const result = await handleKudosTool({ action: 'vouch' });
    expect(result.status).toBe(400);
    expect(result.body.error).toContain('address is required');
  });

  it('returns vouch status', async () => {
    mockQueryVouch.mockReturnValue({
      ok: true,
      address: '0x668add9213985e7fd613aec87767c892f4b9df1c',
      vouches: [],
      count: 0,
    });
    const result = await handleKudosTool({
      action: 'vouch',
      address: '0x668aDd9213985E7Fd613Aec87767C892f4b9dF1c',
    });
    expect(result.status).toBe(200);
    expect(result.body.count).toBe(0);
  });
});
