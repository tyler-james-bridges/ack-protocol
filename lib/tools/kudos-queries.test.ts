import {
  encodeAbiParameters,
  encodeEventTopics,
  parseAbiParameters,
  zeroHash,
} from 'viem';
import { REPUTATION_REGISTRY_ABI } from '@/config/abi';
import { REPUTATION_REGISTRY_ADDRESS } from '@/config/contract';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockGetAllFeedbackEvents = vi.fn();
const mockGetAllFeedbackEventsForChain = vi.fn();
const mockGetStreakForAddress = vi.fn();
const mockGetTip = vi.fn();
const mockGetVouches = vi.fn();
const mockHasDb = vi.fn();
const mockGetDb = vi.fn();
const mockEnsureMigrations = vi.fn();
const mockGetTransactionReceipt = vi.fn();
const mockGetBlock = vi.fn();

vi.mock('../feedback-cache', () => ({
  getAllFeedbackEvents: (...args: unknown[]) =>
    mockGetAllFeedbackEvents(...args),
  getAllFeedbackEventsForChain: (...args: unknown[]) =>
    mockGetAllFeedbackEventsForChain(...args),
}));

vi.mock('../streaks', () => ({
  getStreakForAddress: (...args: unknown[]) => mockGetStreakForAddress(...args),
}));

vi.mock('../tip-store', () => ({
  getTip: (...args: unknown[]) => mockGetTip(...args),
  tipToJSON: (tip: { amountRaw: bigint } & Record<string, unknown>) => ({
    ...tip,
    amountRaw: tip.amountRaw.toString(),
  }),
}));

vi.mock('../vouch-store', () => ({
  getVouches: (...args: unknown[]) => mockGetVouches(...args),
}));

vi.mock('../db', () => ({
  hasDb: () => mockHasDb(),
  getDb: () => mockGetDb(),
  ensureMigrations: (...args: unknown[]) => mockEnsureMigrations(...args),
}));

vi.mock('viem', async () => {
  const actual = await vi.importActual<typeof import('viem')>('viem');
  return {
    ...actual,
    createPublicClient: () => ({
      getTransactionReceipt: mockGetTransactionReceipt,
      getBlock: mockGetBlock,
    }),
    http: () => ({}),
  };
});

describe('kudos-queries', () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetAllFeedbackEvents.mockReset();
    mockGetAllFeedbackEventsForChain.mockReset();
    mockGetStreakForAddress.mockReset();
    mockGetTip.mockReset();
    mockGetVouches.mockReset();
    mockHasDb.mockReset();
    mockGetDb.mockReset();
    mockEnsureMigrations.mockReset();
    mockGetTransactionReceipt.mockReset();
    mockGetBlock.mockReset();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function load() {
    return import('./kudos-queries');
  }

  describe('queryKudosFeed', () => {
    it('filters by agent, sender, and category then limits results', async () => {
      mockGetAllFeedbackEvents.mockResolvedValue([
        {
          sender: '0xaaa',
          agentId: 1,
          tag1: 'kudos',
          tag2: 'speed',
          feedbackURI: 'data:,fast',
          txHash: '0x1',
          blockNumber: '10',
          chainId: 2741,
        },
        {
          sender: '0xbbb',
          agentId: 1,
          tag1: 'kudos',
          tag2: 'speed',
          feedbackURI: 'data:,other',
          txHash: '0x2',
          blockNumber: '20',
          chainId: 2741,
        },
        {
          sender: '0xaaa',
          agentId: 2,
          tag1: 'kudos',
          tag2: 'accuracy',
          feedbackURI: '',
          txHash: '0x3',
          blockNumber: '30',
          chainId: 2741,
        },
      ]);

      const { queryKudosFeed } = await load();
      const result = await queryKudosFeed({
        agentId: 1,
        sender: '0xAAA',
        category: 'speed',
        limit: 10,
      });

      expect(result.total).toBe(1);
      expect(result.items[0].txHash).toBe('0x1');
      expect(result.items[0].message).toBe('fast');
      expect(result.items[0].category).toBe('speed');
    });
  });

  describe('queryKudosDetail', () => {
    it('rejects an invalid tx hash', async () => {
      const { queryKudosDetail } = await load();
      const result = await queryKudosDetail('nope');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(400);
        expect(result.error).toContain('Invalid tx hash');
      }
    });

    it('returns the same attribution and message from REST and the tool for an encoded relay receipt', async () => {
      const sender = '0x0000000000000000000000000000000000000001';
      const fields = {
        from: 'twitter:@ada',
        category: 'speed',
        message: '100% 💚',
        source: 'x',
      };
      const feedbackURI = 'data:,' + encodeURIComponent(JSON.stringify(fields));
      mockGetTransactionReceipt.mockResolvedValue({
        status: 'success',
        blockNumber: BigInt(1),
        logs: [
          {
            address: REPUTATION_REGISTRY_ADDRESS,
            topics: encodeEventTopics({
              abi: REPUTATION_REGISTRY_ABI,
              eventName: 'NewFeedback',
              args: {
                agentId: BigInt(1),
                clientAddress: sender,
                indexedTag1: 'kudos',
              },
            }),
            data: encodeAbiParameters(
              parseAbiParameters(
                'uint64, int128, uint8, string, string, string, string, bytes32'
              ),
              [BigInt(1), BigInt(1), 0, 'kudos', '', '', feedbackURI, zeroHash]
            ),
          },
        ],
      });
      mockGetBlock.mockResolvedValue({ timestamp: BigInt(1_700_000_000) });
      vi.mocked(global.fetch).mockResolvedValue(Response.json({ items: [] }));
      const { queryKudosDetail } = await load();
      const { GET } = await import('@/app/api/kudos/[txHash]/route');
      const { NextRequest } = await import('next/server');
      const txHash = '0x' + 'a'.repeat(64);
      const response = await GET(
        new NextRequest('https://ack.test/api/kudos/' + txHash),
        {
          params: Promise.resolve({ txHash }),
        }
      );
      const expected = { ...fields, from: '@ada', senderName: '@ada' };
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject(expected);
      expect(await queryKudosDetail(txHash)).toMatchObject({
        ok: true,
        kudos: expected,
      });
    });

    it('returns 404 when the receipt has no feedback event', async () => {
      mockGetTransactionReceipt.mockResolvedValue({
        status: 'success',
        blockNumber: BigInt(1),
        logs: [],
      });
      mockGetBlock.mockResolvedValue({ timestamp: BigInt(1_700_000_000) });

      const { queryKudosDetail } = await load();
      const result = await queryKudosDetail(
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(404);
        expect(result.error).toContain('No feedback event');
      }
    });
  });

  describe('queryTipFeed', () => {
    it('requires agentId or tipId', async () => {
      const { queryTipFeed } = await load();
      const result = await queryTipFeed({});
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(400);
        expect(result.error).toContain('agentId or tipId');
      }
    });

    it('returns an empty feed when the database is not configured', async () => {
      mockHasDb.mockReturnValue(false);
      const { queryTipFeed } = await load();
      const result = await queryTipFeed({ agentId: 606 });
      expect(result).toEqual({ ok: true, items: [] });
    });

    it('returns a single tip when tipId is provided', async () => {
      mockHasDb.mockReturnValue(true);
      mockGetTip.mockResolvedValue({
        id: 'tip-1',
        kudosTxHash: '',
        chainId: 2741,
        agentId: 606,
        fromAddress: '0xfrom',
        toAddress: '0xto',
        amountUsd: 1.5,
        amountRaw: BigInt(1_500_000),
        status: 'completed',
        createdAt: 1,
        completedAt: 2,
        expiresAt: 3,
      });

      const { queryTipFeed } = await load();
      const result = await queryTipFeed({ tipId: 'tip-1' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.items).toHaveLength(1);
        expect(result.items[0].tipId).toBe('tip-1');
        expect(result.items[0].amountUsd).toBe(1.5);
      }
    });
  });

  describe('queryTipStats', () => {
    it('requires agentId or wallet', async () => {
      const { queryTipStats } = await load();
      const result = await queryTipStats({});
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(400);
      }
    });

    it('returns zeros when the database is not configured', async () => {
      mockHasDb.mockReturnValue(false);
      const { queryTipStats } = await load();
      const result = await queryTipStats({ agentId: 1 });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.stats.totalReceived).toBe(0);
        expect(result.stats.totalGiven).toBe(0);
      }
    });
  });

  describe('queryStreaks', () => {
    it('rejects an invalid address', async () => {
      const { queryStreaks } = await load();
      const result = await queryStreaks('not-an-address');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(400);
      }
    });

    it('returns streak data for a valid address', async () => {
      mockGetStreakForAddress.mockResolvedValue({
        currentStreak: 3,
        longestStreak: 5,
        lastKudosDate: '2026-05-01',
        isActiveToday: true,
        totalDaysActive: 8,
      });

      const { queryStreaks } = await load();
      const result = await queryStreaks(
        '0x668aDd9213985E7Fd613Aec87767C892f4b9dF1c'
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.streak.currentStreak).toBe(3);
        expect(result.address).toBe(
          '0x668add9213985e7fd613aec87767c892f4b9df1c'
        );
      }
    });
  });

  describe('queryVouch', () => {
    it('rejects an invalid address', async () => {
      const { queryVouch } = await load();
      const result = queryVouch('0x123');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(400);
      }
    });

    it('returns pending vouches', async () => {
      mockGetVouches.mockReturnValue({
        vouches: [
          {
            from: '0xabc',
            category: 'reliability',
            message: 'good',
            timestamp: '2026-05-01T00:00:00.000Z',
          },
        ],
        count: 1,
      });

      const { queryVouch } = await load();
      const result = queryVouch('0x668aDd9213985E7Fd613Aec87767C892f4b9dF1c');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.count).toBe(1);
        expect(result.vouches[0].category).toBe('reliability');
      }
    });
  });
});
