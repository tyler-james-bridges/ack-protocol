import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to test parseMessage which is private.
// We'll mock the heavy dependencies and test through getHomePageData,
// but also extract parseMessage logic by testing the recentKudos output.

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

  it('parses base64 feedback URI messages', async () => {
    const { getAllFeedbackEventsForChain } = await import('../feedback-cache');
    const payload = JSON.stringify({ reasoning: 'Great work!' });
    const base64 = Buffer.from(payload).toString('base64');
    const feedbackURI = `data:application/json;base64,${base64}`;

    vi.mocked(getAllFeedbackEventsForChain).mockResolvedValue([
      {
        sender: '0xabc',
        agentId: 1,
        tag1: 'kudos',
        tag2: 'reliability',
        feedbackURI,
        txHash: '0x123',
        blockNumber: '100',
      },
    ] as never);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [],
          meta: { pagination: { total: 0 } },
        }),
    } as Response);

    const { getHomePageData } = await getModule();
    const data = await getHomePageData(2741);
    expect(data.recentKudos[0].message).toBe('Great work!');
  });

  it('parses data:, URI messages', async () => {
    const { getAllFeedbackEventsForChain } = await import('../feedback-cache');
    const payload = JSON.stringify({ reasoning: 'Nice agent' });
    const feedbackURI = `data:,${encodeURIComponent(payload)}`;

    vi.mocked(getAllFeedbackEventsForChain).mockResolvedValue([
      {
        sender: '0xdef',
        agentId: 2,
        tag1: 'kudos',
        tag2: 'speed',
        feedbackURI,
        txHash: '0x456',
        blockNumber: '200',
      },
    ] as never);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [],
          meta: { pagination: { total: 0 } },
        }),
    } as Response);

    const { getHomePageData } = await getModule();
    const data = await getHomePageData(2741);
    expect(data.recentKudos[0].message).toBe('Nice agent');
  });

  it('returns null message for malformed URI', async () => {
    const { getAllFeedbackEventsForChain } = await import('../feedback-cache');

    vi.mocked(getAllFeedbackEventsForChain).mockResolvedValue([
      {
        sender: '0xabc',
        agentId: 1,
        tag1: 'kudos',
        tag2: 'accuracy',
        feedbackURI: 'not-a-valid-uri',
        txHash: '0x789',
        blockNumber: '300',
      },
    ] as never);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [],
          meta: { pagination: { total: 0 } },
        }),
    } as Response);

    const { getHomePageData } = await getModule();
    const data = await getHomePageData(2741);
    expect(data.recentKudos[0].message).toBeNull();
  });

  it('parses raw JSON string feedback URI', async () => {
    const { getAllFeedbackEventsForChain } = await import('../feedback-cache');
    const feedbackURI = JSON.stringify({ message: 'Hello from JSON' });

    vi.mocked(getAllFeedbackEventsForChain).mockResolvedValue([
      {
        sender: '0xabc',
        agentId: 1,
        tag1: 'kudos',
        tag2: 'creativity',
        feedbackURI,
        txHash: '0xabc',
        blockNumber: '400',
      },
    ] as never);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [],
          meta: { pagination: { total: 0 } },
        }),
    } as Response);

    const { getHomePageData } = await getModule();
    const data = await getHomePageData(2741);
    expect(data.recentKudos[0].message).toBe('Hello from JSON');
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
