import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('api', () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function getModule() {
    return import('../api');
  }

  function mockFetchResponse(data: unknown) {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(data),
    } as Response);
  }

  describe('fetchAgents', () => {
    it('calls proxy with correct params', async () => {
      mockFetchResponse({ items: [], total: 0, limit: 50, offset: 0 });
      const { fetchAgents } = await getModule();
      await fetchAgents({ limit: 10, offset: 0 });

      expect(global.fetch).toHaveBeenCalledOnce();
      const url = vi.mocked(global.fetch).mock.calls[0][0] as string;
      expect(url).toContain('path=agents');
      expect(url).toContain('limit=10');
    });

    it('returns response data', async () => {
      const mockData = {
        items: [{ id: '1', name: 'Test Agent' }],
        total: 1,
        limit: 50,
        offset: 0,
      };
      mockFetchResponse(mockData);

      const { fetchAgents } = await getModule();
      const result = await fetchAgents();
      expect(result.items).toHaveLength(1);
    });
  });

  describe('fetchAgentsByChain', () => {
    it('filters by chain ID and excludes testnets', async () => {
      mockFetchResponse({
        items: [
          { id: '1', chain_id: 2741, is_testnet: false, name: 'A' },
          { id: '2', chain_id: 8453, is_testnet: false, name: 'B' },
          { id: '3', chain_id: 2741, is_testnet: true, name: 'C' },
        ],
        total: 3,
        limit: 50,
        offset: 0,
      });

      const { fetchAgentsByChain } = await getModule();
      const result = await fetchAgentsByChain(2741);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('A');
    });
  });

  describe('fetchAgent', () => {
    it('finds agent by chain:tokenId', async () => {
      mockFetchResponse({
        items: [
          { id: '1', token_id: '42', chain_id: 2741, name: 'TargetAgent' },
          { id: '2', token_id: '99', chain_id: 2741, name: 'Other' },
        ],
        total: 2,
        limit: 20,
        offset: 0,
      });

      const { fetchAgent } = await getModule();
      const result = await fetchAgent('2741:42');
      expect(result.name).toBe('TargetAgent');
    });

    it('throws when agent not found', async () => {
      mockFetchResponse({ items: [], total: 0, limit: 20, offset: 0 });

      const { fetchAgent } = await getModule();
      await expect(fetchAgent('2741:999')).rejects.toThrow('Agent not found');
    });
  });

  describe('fetchAgentFeedback', () => {
    it('returns feedback items', async () => {
      mockFetchResponse({ items: [{ id: '1' }, { id: '2' }] });

      const { fetchAgentFeedback } = await getModule();
      const result = await fetchAgentFeedback(2741, '42');
      expect(result).toHaveLength(2);
    });

    it('returns empty array on error', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('network'));

      const { fetchAgentFeedback } = await getModule();
      const result = await fetchAgentFeedback(2741, '42');
      expect(result).toEqual([]);
    });
  });

  describe('fetchLeaderboard', () => {
    it('returns sorted agents by default (created_at)', async () => {
      const items = [
        {
          id: '1',
          name: 'Old',
          created_at: '2025-01-01',
          is_testnet: false,
          total_score: 10,
        },
        {
          id: '2',
          name: 'New',
          created_at: '2025-06-01',
          is_testnet: false,
          total_score: 5,
        },
      ];
      mockFetchResponse({ items, total: 2, limit: 100, offset: 0 });

      const { fetchLeaderboard } = await getModule();
      const result = await fetchLeaderboard({ chainId: 2741 });
      expect(result[0].name).toBe('New');
      expect(result[1].name).toBe('Old');
    });

    it('sorts by numeric field', async () => {
      const items = [
        {
          id: '1',
          name: 'Low',
          total_score: 10,
          is_testnet: false,
          created_at: '2025-01-01',
        },
        {
          id: '2',
          name: 'High',
          total_score: 100,
          is_testnet: false,
          created_at: '2025-01-01',
        },
      ];
      mockFetchResponse({ items, total: 2, limit: 100, offset: 0 });

      const { fetchLeaderboard } = await getModule();
      const result = await fetchLeaderboard({
        chainId: 2741,
        sortBy: 'total_score',
      });
      expect(result[0].name).toBe('High');
      expect(result[1].name).toBe('Low');
    });
  });
});
