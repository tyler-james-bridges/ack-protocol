import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { getFeedbackByAgentId } = vi.hoisted(() => ({
  getFeedbackByAgentId: vi.fn(),
}));

vi.mock('../feedback-cache', () => ({
  getFeedbackByAgentId,
}));

function scanAgent(overrides: Record<string, unknown> = {}) {
  return {
    id: '2741:1',
    agent_id: '1',
    token_id: '1',
    chain_id: 2741,
    is_testnet: false,
    contract_address: '0x8004',
    name: 'ACK',
    description: 'Reputation agent',
    owner_address: '0x1111111111111111111111111111111111111111',
    image_url: null,
    is_verified: true,
    star_count: 1,
    total_score: 42,
    total_feedbacks: 3,
    average_score: 4,
    supported_protocols: ['mcp'],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    tags: ['reputation'],
    ...overrides,
  };
}

function mockFetch(data: unknown, status = 200) {
  vi.mocked(global.fetch).mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as Response);
}

describe('tool-queries', () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn();
    getFeedbackByAgentId.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function load() {
    return import('../tool-queries');
  }

  it('aggregates kudos categories and top category', async () => {
    const { aggregateKudos } = await load();
    const result = aggregateKudos([
      { tag1: 'kudos', tag2: 'reliability' },
      { tag1: 'kudos', tag2: 'reliability' },
      { tag1: 'kudos', tag2: 'speed' },
      { tag1: 'review', tag2: 'accuracy' },
    ]);
    expect(result.kudosCount).toBe(3);
    expect(result.categories.reliability).toBe(2);
    expect(result.categories.speed).toBe(1);
    expect(result.topCategory).toBe('reliability');
  });

  it('builds an empty reputation profile when the wallet owns no agents', async () => {
    mockFetch({ items: [], total: 0, limit: 100, offset: 0 });
    const { getReputationByAddress } = await load();
    const profile = await getReputationByAddress(
      '0x1111111111111111111111111111111111111111'
    );
    expect(profile.agents).toEqual([]);
    expect(profile.aggregatedScore).toBe(0);
    expect(profile.trustScore).toBe(0);
    expect(profile.totalKudos).toBe(0);
    expect(profile.topCategory).toBeNull();
  });

  it('aggregates reputation across owned agents', async () => {
    mockFetch({
      items: [
        scanAgent(),
        scanAgent({
          id: '2741:2',
          token_id: '2',
          name: 'Other',
          total_score: 18,
        }),
      ],
      total: 2,
      limit: 100,
      offset: 0,
    });
    getFeedbackByAgentId.mockImplementation(async (agentId: number) => {
      if (agentId === 1) {
        return [{ tag1: 'kudos', tag2: 'accuracy' }];
      }
      return [{ tag1: 'kudos', tag2: 'security' }];
    });

    const { getReputationByAddress } = await load();
    const profile = await getReputationByAddress(
      '0x1111111111111111111111111111111111111111'
    );
    expect(profile.agents).toHaveLength(2);
    expect(profile.aggregatedScore).toBe(30);
    expect(profile.trustScore).toBe(30);
    expect(profile.totalKudos).toBe(2);
    expect(profile.categories.accuracy).toBe(1);
    expect(profile.categories.security).toBe(1);
  });

  it('paginates feedback history newest first', async () => {
    getFeedbackByAgentId.mockResolvedValue([
      {
        sender: '0xaaa',
        agentId: 606,
        value: '5',
        tag1: 'kudos',
        tag2: 'reliability',
        feedbackURI: '',
        feedbackHash: '0x1',
        blockNumber: '100',
        txHash: '0xold',
        chainId: 2741,
      },
      {
        sender: '0xbbb',
        agentId: 606,
        value: '5',
        tag1: 'kudos',
        tag2: 'speed',
        feedbackURI: '',
        feedbackHash: '0x2',
        blockNumber: '200',
        txHash: '0xnew',
        chainId: 2741,
      },
    ]);

    const { getFeedbackHistory } = await load();
    const page = await getFeedbackHistory({
      agentId: 606,
      limit: 1,
      offset: 0,
    });
    expect(page.total).toBe(2);
    expect(page.events).toHaveLength(1);
    expect(page.events[0].txHash).toBe('0xnew');
    expect(page.events[0].category).toBe('speed');
  });

  it('discovers agents and filters by category', async () => {
    mockFetch({
      items: [
        scanAgent(),
        scanAgent({ id: '2741:9', token_id: '9', name: 'Skip' }),
      ],
      total: 2,
      limit: 40,
      offset: 0,
    });
    getFeedbackByAgentId.mockImplementation(async (agentId: number) => {
      if (agentId === 1) return [{ tag1: 'kudos', tag2: 'reliability' }];
      return [];
    });

    const { discoverAgents } = await load();
    const result = await discoverAgents({ category: 'reliability', limit: 10 });
    expect(result.agents).toHaveLength(1);
    expect(result.agents[0].name).toBe('ACK');
    expect(result.agents[0].kudosCount).toBe(1);
  });

  it('returns null for a missing agent detail', async () => {
    mockFetch({ error: 'not found' }, 404);
    const { getAgentInfo } = await load();
    await expect(
      getAgentInfo({ chainId: 2741, agentId: 999 })
    ).resolves.toBeNull();
  });

  it('normalizes a found agent into agent_info shape', async () => {
    mockFetch(scanAgent({ token_id: '606', name: 'ACK Protocol' }));
    const { getAgentInfo } = await load();
    const info = await getAgentInfo({ chainId: 2741, agentId: 606 });
    expect(info).toMatchObject({
      chainId: 2741,
      agentId: 606,
      name: 'ACK Protocol',
      ownerAddress: '0x1111111111111111111111111111111111111111',
      isVerified: true,
    });
  });
});
