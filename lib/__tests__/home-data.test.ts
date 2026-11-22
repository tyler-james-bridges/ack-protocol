import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('viem', async () => {
  const actual = await vi.importActual('viem');
  return {
    ...actual,
    createPublicClient: () => ({
      getBlock: vi.fn().mockResolvedValue({ timestamp: BigInt(1718452800) }),
    }),
    http: () => ({}),
  };
});

vi.mock('viem/chains', () => ({
  abstract: { id: 2741, name: 'Abstract' },
  abstractTestnet: { id: 11124, name: 'Abstract Testnet' },
  base: { id: 8453, name: 'Base' },
  mainnet: { id: 1, name: 'Ethereum' },
}));

vi.mock('../feedback-cache', () => ({
  getAllFeedbackEventsForChain: vi.fn().mockResolvedValue([]),
}));

vi.mock('../streaks', () => ({
  getAllStreaks: vi.fn().mockResolvedValue(new Map()),
  getTopStreakers: vi.fn().mockResolvedValue([]),
}));

describe('home-data', () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function getModule() {
    return import('../home-data');
  }

  it('keeps absent feedback distinct from a message in the server feed', async () => {
    const { getAllFeedbackEventsForChain } = await import('../feedback-cache');
    const uris = [JSON.stringify({ message: 'Well done!' }), '', 'data:,{}'];
    vi.mocked(getAllFeedbackEventsForChain).mockResolvedValue(
      uris.map((feedbackURI, i) => ({
        feedbackURI,
        sender: '0xabc',
        agentId: i + 1,
        chainId: 2741,
        feedbackIndex: '0',
        value: '1',
        tag1: 'kudos',
        tag2: '',
        feedbackHash: '0x0',
        txHash: '0x' + i,
        blockNumber: String(100 - i),
      }))
    );
    vi.mocked(global.fetch).mockResolvedValue(Response.json({ data: [] }));

    const { getHomePageData } = await getModule();
    const data = await getHomePageData(2741);
    expect(data.recentKudos.map((kudos) => kudos.message)).toEqual([
      'Well done!',
      null,
      null,
    ]);
  });

  it('returns stats from agent data', async () => {
    const { getAllFeedbackEventsForChain } = await import('../feedback-cache');
    vi.mocked(getAllFeedbackEventsForChain).mockResolvedValue([]);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            {
              id: '1',
              token_id: '1',
              chain_id: 2741,
              is_testnet: false,
              name: 'Agent1',
              total_score: 100,
              total_feedbacks: 5,
              owner_address: '0xowner',
              created_at: '2025-01-01',
            },
          ],
          meta: { pagination: { total: 1 } },
        }),
    } as Response);

    const { getHomePageData } = await getModule();
    const data = await getHomePageData(2741);
    expect(data.stats.total_agents).toBe(1);
    expect(data.stats.total_kudos).toBe(0);
  });

  it('keeps Base kudos at zero when the archive cursor is absent', async () => {
    const previous = process.env.BASE_FEEDBACK_DIR;
    process.env.BASE_FEEDBACK_DIR = '/tmp/base-feedback-absent-home';
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            {
              id: '1',
              token_id: '46000',
              chain_id: 8453,
              is_testnet: false,
              name: 'Clawdia',
              total_score: 10,
              total_feedbacks: 1,
              owner_address: '0xowner',
              created_at: '2025-01-01',
            },
          ],
          meta: { pagination: { total: 1 } },
        }),
    } as Response);

    try {
      const { getHomePageData } = await getModule();
      const data = await getHomePageData(8453);
      expect(data.feedError).toBe(false);
      expect(data.recentKudos).toEqual([]);
      expect(data.stats.total_kudos).toBe(0);
      expect(data.leaderboard[0]?.kudos).toBe(0);
    } finally {
      if (previous === undefined) delete process.env.BASE_FEEDBACK_DIR;
      else process.env.BASE_FEEDBACK_DIR = previous;
    }
  });
});
