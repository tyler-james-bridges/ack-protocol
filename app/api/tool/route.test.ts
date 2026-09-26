import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/tool-queries', () => ({
  ETH_ADDRESS_RE: /^0x[0-9a-fA-F]{40}$/,
  MAX_DISCOVER_LIMIT: 50,
  MAX_FEEDBACK_LIMIT: 100,
  isKudosCategory: (value: string) =>
    [
      'reliability',
      'speed',
      'accuracy',
      'creativity',
      'collaboration',
      'security',
    ].includes(value),
  getReputationByAddress: vi.fn().mockResolvedValue({
    address: '0x1111111111111111111111111111111111111111',
    agents: [
      {
        chainId: 2741,
        agentId: 606,
        name: 'ACK',
        totalScore: 42,
      },
    ],
    aggregatedScore: 42,
    trustScore: 42,
    totalKudos: 3,
    topCategory: 'reliability',
    categories: {
      reliability: 3,
      speed: 0,
      accuracy: 0,
      creativity: 0,
      collaboration: 0,
      security: 0,
    },
  }),
  getFeedbackHistory: vi.fn().mockResolvedValue({
    agentId: 606,
    events: [
      {
        sender: '0xabc',
        agentId: 606,
        value: '5',
        tag1: 'kudos',
        tag2: 'reliability',
        category: 'reliability',
        txHash: '0xfeed',
        blockNumber: '100',
        chainId: 2741,
      },
    ],
    total: 1,
    limit: 20,
    offset: 0,
  }),
  discoverAgents: vi.fn().mockResolvedValue({
    agents: [
      {
        chainId: 2741,
        agentId: 606,
        name: 'ACK',
        description: 'Reputation layer',
        ownerAddress: '0x1111111111111111111111111111111111111111',
        totalScore: 42,
        kudosCount: 3,
        topCategory: 'reliability',
      },
    ],
    total: 1,
    limit: 20,
    offset: 0,
  }),
  getAgentInfo: vi
    .fn()
    .mockImplementation(
      async ({ chainId, agentId }: { chainId: number; agentId: number }) => {
        if (agentId === 999) return null;
        return {
          chainId,
          agentId,
          name: 'ACK',
          description: 'Reputation layer',
          ownerAddress: '0x1111111111111111111111111111111111111111',
          totalScore: 42,
          totalFeedbacks: 3,
          isVerified: true,
          imageUrl: null,
          tags: ['reputation'],
          categories: [],
          supportedProtocols: ['mcp'],
          createdAt: '2026-01-01T00:00:00Z',
        };
      }
    ),
}));

import { GET, POST, OPTIONS } from './route';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/tool', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('input validation', () => {
    it('rejects invalid JSON', async () => {
      const req = new NextRequest('http://localhost:3000/api/tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-json{{{',
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid JSON');
    });

    it('rejects a missing action', async () => {
      const res = await POST(makeRequest({}));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('action is required');
    });

    it('rejects an unknown action without rewriting the dispatcher', async () => {
      const res = await POST(makeRequest({ action: 'kudos_feed' }));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid action');
      expect(data.error).toContain('reputation');
    });
  });

  describe('reputation', () => {
    it('returns a full reputation profile', async () => {
      const res = await POST(
        makeRequest({
          action: 'reputation',
          address: '0x1111111111111111111111111111111111111111',
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.trustScore).toBe(42);
      expect(data.totalKudos).toBe(3);
      expect(data.agents[0].agentId).toBe(606);
    });

    it('rejects a missing or invalid address', async () => {
      const missing = await POST(makeRequest({ action: 'reputation' }));
      expect(missing.status).toBe(400);
      const invalid = await POST(
        makeRequest({ action: 'reputation', address: 'not-an-address' })
      );
      expect(invalid.status).toBe(400);
    });
  });

  describe('feedback_history', () => {
    it('returns paginated feedback', async () => {
      const res = await POST(
        makeRequest({ action: 'feedback_history', agentId: 606, limit: 10 })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.events).toHaveLength(1);
      expect(data.events[0].category).toBe('reliability');
    });

    it('requires agentId', async () => {
      const res = await POST(makeRequest({ action: 'feedback_history' }));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('agentId');
    });
  });

  describe('discover', () => {
    it('returns filtered agents', async () => {
      const res = await POST(
        makeRequest({
          action: 'discover',
          category: 'reliability',
          query: 'ack',
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.agents[0].name).toBe('ACK');
    });

    it('rejects an invalid category', async () => {
      const res = await POST(
        makeRequest({ action: 'discover', category: 'vibes' })
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid category');
    });
  });

  describe('agent_info', () => {
    it('returns a single agent by scanId', async () => {
      const res = await POST(
        makeRequest({ action: 'agent_info', scanId: '2741:606' })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.agent.agentId).toBe(606);
      expect(data.agent.chainId).toBe(2741);
    });

    it('returns 404 when the agent is missing', async () => {
      const res = await POST(
        makeRequest({ action: 'agent_info', agentId: 999, chainId: 2741 })
      );
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain('not found');
    });

    it('requires agentId or scanId', async () => {
      const res = await POST(makeRequest({ action: 'agent_info' }));
      expect(res.status).toBe(400);
    });
  });
});

describe('GET /api/tool', () => {
  it('lists registered reputation actions for later tools to extend', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    const names = data.actions.map((a: { name: string }) => a.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'reputation',
        'feedback_history',
        'discover',
        'agent_info',
      ])
    );
    expect(data.manifests['ack-reputation']).toContain(
      '/.well-known/ai-tool/ack-reputation.json'
    );
  });
});

describe('OPTIONS /api/tool', () => {
  it('returns CORS headers', async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });
});
