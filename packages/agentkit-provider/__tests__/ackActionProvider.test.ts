import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AckActionProvider } from '../src/ackActionProvider';
import {
  ACK_API_BASE_URL,
  IDENTITY_REGISTRY_ADDRESS,
  REPUTATION_REGISTRY_ADDRESS,
} from '../src/constants';

// Mock wallet provider
const mockWalletProvider = {
  getAddress: vi.fn().mockReturnValue('0xTestAddress'),
  getNetwork: vi.fn().mockResolvedValue({
    protocolFamily: 'evm',
    chainId: 2741,
  }),
  sendTransaction: vi.fn().mockResolvedValue('0xMockTxHash'),
  waitForTransactionReceipt: vi.fn().mockResolvedValue({
    status: 'success',
    transactionHash: '0xMockTxHash',
  }),
  readContract: vi.fn(),
  nativeTransfer: vi.fn(),
} as any;

describe('AckActionProvider', () => {
  let provider: AckActionProvider;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    provider = new AckActionProvider();
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('supportsNetwork', () => {
    it('returns true for EVM networks', () => {
      expect(
        provider.supportsNetwork({
          protocolFamily: 'evm',
          chainId: 2741,
        } as any)
      ).toBe(true);
      expect(
        provider.supportsNetwork({
          protocolFamily: 'evm',
          chainId: 8453,
        } as any)
      ).toBe(true);
      expect(
        provider.supportsNetwork({ protocolFamily: 'evm', chainId: 1 } as any)
      ).toBe(true);
    });

    it('returns false for non-EVM networks', () => {
      expect(
        provider.supportsNetwork({ protocolFamily: 'solana' } as any)
      ).toBe(false);
    });
  });

  describe('search_agents', () => {
    it('returns matching agents', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          agents: [
            { name: 'ACK Agent', chainId: 2741, tokenId: 606, score: 95 },
            { name: 'Test Bot', chainId: 8453, tokenId: 100, score: 80 },
          ],
        }),
      });

      const result = await provider.searchAgents(mockWalletProvider, {
        query: 'ACK',
        limit: 10,
      });

      expect(result).toContain('Found 2 agent(s) matching "ACK"');
      expect(result).toContain('ACK Agent');
      expect(result).toContain('Test Bot');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/agents/search?q=ACK')
      );
    });

    it('handles no results', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ agents: [] }),
      });

      const result = await provider.searchAgents(mockWalletProvider, {
        query: 'nonexistent',
        limit: 10,
      });

      expect(result).toContain('No agents found for query "nonexistent"');
    });

    it('handles API errors', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await provider.searchAgents(mockWalletProvider, {
        query: 'test',
        limit: 10,
      });

      expect(result).toContain('Error searching agents');
    });

    it('passes chainId filter when provided', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ agents: [] }),
      });

      await provider.searchAgents(mockWalletProvider, {
        query: 'test',
        chainId: 2741,
        limit: 10,
      });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('chainId=2741')
      );
    });
  });

  describe('get_agent', () => {
    it('returns agent details', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          agent: {
            name: 'ACK Agent',
            description: 'The ACK Protocol agent',
            rank: 5,
            score: 95,
            protocols: ['ERC-8004'],
            services: ['reputation'],
          },
        }),
      });

      const result = await provider.getAgent(mockWalletProvider, {
        chainId: 2741,
        tokenId: 606,
      });

      expect(result).toContain('ACK Agent');
      expect(result).toContain('Rank: #5');
      expect(result).toContain('Score: 95');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/agents/2741/606')
      );
    });

    it('handles missing agent', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await provider.getAgent(mockWalletProvider, {
        chainId: 2741,
        tokenId: 99999,
      });

      expect(result).toContain('Error getting agent');
    });
  });

  describe('get_reputation', () => {
    it('returns reputation data', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          agent: {
            name: 'ACK Agent',
            score: 95,
            rank: 5,
            feedbackCount: 42,
            averageScore: 88.5,
            health: 'good',
          },
        }),
      });

      const result = await provider.getReputation(mockWalletProvider, {
        chainId: 2741,
        tokenId: 606,
      });

      expect(result).toContain('Reputation for ACK Agent');
      expect(result).toContain('Overall score: 95');
      expect(result).toContain('Rank: #5');
      expect(result).toContain('Feedback count: 42');
      expect(result).toContain('Average feedback score: 88.5');
      expect(result).toContain('Health status: good');
    });
  });

  describe('get_agent_feedbacks', () => {
    it('returns feedback list', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          feedbacks: [
            {
              value: 90,
              tag1: 'reliability',
              tag2: '',
              clientAddress: '0xABC123',
            },
            {
              value: 85,
              tag1: 'speed',
              tag2: 'fast',
              clientAddress: '0xDEF456',
            },
          ],
        }),
      });

      const result = await provider.getAgentFeedbacks(mockWalletProvider, {
        chainId: 2741,
        tokenId: 606,
        limit: 20,
      });

      expect(result).toContain('Found 2 feedback(s)');
      expect(result).toContain('reliability');
      expect(result).toContain('speed');
    });

    it('handles no feedbacks', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ feedbacks: [] }),
      });

      const result = await provider.getAgentFeedbacks(mockWalletProvider, {
        chainId: 2741,
        tokenId: 606,
        limit: 20,
      });

      expect(result).toContain('No feedback found');
    });
  });

  describe('give_kudos', () => {
    it('sends kudos transaction', async () => {
      const result = await provider.giveKudos(mockWalletProvider, {
        agentId: 606,
        value: 85,
        tag1: 'reliability',
        tag2: '',
      });

      expect(result).toContain('Successfully gave 85 kudos to agent 606');
      expect(result).toContain('on the connected chain');
      expect(result).toContain('0xMockTxHash');
      expect(mockWalletProvider.sendTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          to: REPUTATION_REGISTRY_ADDRESS,
        })
      );
      expect(mockWalletProvider.waitForTransactionReceipt).toHaveBeenCalledWith(
        '0xMockTxHash'
      );
    });

    it('handles transaction failure', async () => {
      mockWalletProvider.sendTransaction.mockRejectedValueOnce(
        new Error('Insufficient funds')
      );

      const result = await provider.giveKudos(mockWalletProvider, {
        agentId: 606,
        value: 50,
        tag1: '',
        tag2: '',
      });

      expect(result).toContain('Error giving kudos');
      expect(result).toContain('Insufficient funds');
    });
  });

  describe('register_agent', () => {
    it('registers a new agent', async () => {
      const result = await provider.registerAgent(mockWalletProvider, {
        agentURI: 'ipfs://QmTestHash',
      });

      expect(result).toContain('Successfully registered new agent');
      expect(result).toContain('on the connected chain');
      expect(result).toContain('0xMockTxHash');
      expect(mockWalletProvider.sendTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          to: IDENTITY_REGISTRY_ADDRESS,
        })
      );
    });

    it('handles registration failure', async () => {
      mockWalletProvider.sendTransaction.mockRejectedValueOnce(
        new Error('Revert: already registered')
      );

      const result = await provider.registerAgent(mockWalletProvider, {
        agentURI: 'ipfs://QmTestHash',
      });

      expect(result).toContain('Error registering agent');
    });
  });

  describe('update_agent_uri', () => {
    it('updates agent URI', async () => {
      const result = await provider.updateAgentUri(mockWalletProvider, {
        agentId: 606,
        newURI: 'ipfs://QmNewHash',
      });

      expect(result).toContain('Successfully updated agent 606');
      expect(result).toContain('ipfs://QmNewHash');
      expect(result).toContain('on the connected chain');
      expect(result).toContain('0xMockTxHash');
      expect(mockWalletProvider.sendTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          to: IDENTITY_REGISTRY_ADDRESS,
        })
      );
    });

    it('handles update failure', async () => {
      mockWalletProvider.sendTransaction.mockRejectedValueOnce(
        new Error('Not owner')
      );

      const result = await provider.updateAgentUri(mockWalletProvider, {
        agentId: 606,
        newURI: 'ipfs://QmNewHash',
      });

      expect(result).toContain('Error updating agent URI');
      expect(result).toContain('Not owner');
    });
  });

  describe('tip_agent', () => {
    it('creates a tip successfully', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          tipId: 'tip_abc123',
          paymentUrl: 'https://ack-onchain.dev/tips/tip_abc123',
        }),
      });

      const result = await provider.tipAgent(mockWalletProvider, {
        chainId: 2741,
        agentId: 606,
        amount: 1.5,
        message: 'Great work!',
      });

      expect(result).toContain('Successfully created tip of $1.5 USDC');
      expect(result).toContain('tip_abc123');
      expect(result).toContain('Great work!');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${ACK_API_BASE_URL}/api/tips`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('creates a tip without message', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ tipId: 'tip_xyz' }),
      });

      const result = await provider.tipAgent(mockWalletProvider, {
        chainId: 2741,
        agentId: 606,
        amount: 0.01,
      });

      expect(result).toContain('Successfully created tip of $0.01 USDC');
      expect(result).toContain('tip_xyz');
      expect(result).not.toContain('Message:');
    });

    it('handles API errors', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Invalid amount',
      });

      const result = await provider.tipAgent(mockWalletProvider, {
        chainId: 2741,
        agentId: 606,
        amount: 0.005,
      });

      expect(result).toContain('Error tipping agent');
    });

    it('handles network errors', async () => {
      globalThis.fetch = vi
        .fn()
        .mockRejectedValue(new Error('Network failure'));

      const result = await provider.tipAgent(mockWalletProvider, {
        chainId: 2741,
        agentId: 606,
        amount: 5,
      });

      expect(result).toContain('Error tipping agent 606');
      expect(result).toContain('Network failure');
    });
  });

  describe('get_trust_categories', () => {
    it('returns all 6 trust categories', async () => {
      const result = await provider.getTrustCategories(mockWalletProvider, {});

      expect(result).toContain('ERC-8004 Trust Categories:');
      expect(result).toContain('reliability');
      expect(result).toContain('speed');
      expect(result).toContain('accuracy');
      expect(result).toContain('creativity');
      expect(result).toContain('collaboration');
      expect(result).toContain('security');
    });

    it('includes usage guidance for each category', async () => {
      const result = await provider.getTrustCategories(mockWalletProvider, {});

      expect(result).toContain('Consistent, dependable performance');
      expect(result).toContain('Fast response times');
      expect(result).toContain('Correct, precise outputs');
      expect(result).toContain('Novel approaches');
      expect(result).toContain('Works well with other agents');
      expect(result).toContain('Safe, trustworthy behavior');
    });
  });

  describe('get_leaderboard', () => {
    it('returns top agents', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          agents: [
            { name: 'Top Agent', tokenId: 1, star_count: 100, score: 99 },
            { name: 'Second Agent', tokenId: 2, star_count: 80, score: 95 },
          ],
        }),
      });

      const result = await provider.getLeaderboard(mockWalletProvider, {
        chainId: 2741,
        limit: 10,
      });

      expect(result).toContain('Top 2 agents on chain 2741');
      expect(result).toContain('1. Top Agent');
      expect(result).toContain('2. Second Agent');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('sort=star_count')
      );
    });

    it('handles empty leaderboard', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ agents: [] }),
      });

      const result = await provider.getLeaderboard(mockWalletProvider, {
        chainId: 9999,
        limit: 10,
      });

      expect(result).toContain('No agents found on chain 9999');
    });

    it('handles API errors', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await provider.getLeaderboard(mockWalletProvider, {
        chainId: 2741,
        limit: 10,
      });

      expect(result).toContain('Error getting leaderboard');
    });
  });

  describe('compare_agents', () => {
    it('compares two agents side by side', async () => {
      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            agent: {
              name: 'Agent Alpha',
              score: 95,
              rank: 3,
              feedbackCount: 50,
              averageScore: 90,
              health: 'good',
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            agent: {
              name: 'Agent Beta',
              score: 80,
              rank: 15,
              feedbackCount: 20,
              averageScore: 75,
              health: 'fair',
            },
          }),
        });

      const result = await provider.compareAgents(mockWalletProvider, {
        chainIdA: 2741,
        tokenIdA: 100,
        chainIdB: 8453,
        tokenIdB: 200,
      });

      expect(result).toContain('Agent Comparison:');
      expect(result).toContain('Agent Alpha');
      expect(result).toContain('Score: 95');
      expect(result).toContain('Rank: #3');
      expect(result).toContain('Agent Beta');
      expect(result).toContain('Score: 80');
      expect(result).toContain('Rank: #15');
    });

    it('handles first agent fetch failure', async () => {
      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ agent: { name: 'Agent Beta' } }),
        });

      const result = await provider.compareAgents(mockWalletProvider, {
        chainIdA: 2741,
        tokenIdA: 999,
        chainIdB: 8453,
        tokenIdB: 200,
      });

      expect(result).toContain('Error fetching agent A');
    });

    it('handles second agent fetch failure', async () => {
      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ agent: { name: 'Agent Alpha' } }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        });

      const result = await provider.compareAgents(mockWalletProvider, {
        chainIdA: 2741,
        tokenIdA: 100,
        chainIdB: 8453,
        tokenIdB: 999,
      });

      expect(result).toContain('Error fetching agent B');
    });

    it('handles network errors', async () => {
      globalThis.fetch = vi
        .fn()
        .mockRejectedValue(new Error('Connection refused'));

      const result = await provider.compareAgents(mockWalletProvider, {
        chainIdA: 2741,
        tokenIdA: 100,
        chainIdB: 8453,
        tokenIdB: 200,
      });

      expect(result).toContain('Error comparing agents');
    });
  });
});
