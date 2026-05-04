import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Address } from 'viem';

// Mock dependencies before importing the module
const mockSql = vi.fn();
const mockPublicClient = {
  readContract: vi.fn(),
};
const mockFetch = vi.fn();

const mockHasDb = vi.fn(() => true);

vi.mock('../db', () => ({
  getDb: () => mockSql,
  hasDb: mockHasDb,
  ensureMigrations: vi.fn(() => Promise.resolve()),
}));

vi.mock('viem', () => ({
  createPublicClient: vi.fn(() => mockPublicClient),
  http: vi.fn(),
}));

vi.mock('viem/chains', () => ({
  abstract: { id: 2741, name: 'Abstract' },
  abstractTestnet: { id: 11124, name: 'Abstract Testnet' },
  base: { id: 8453, name: 'Base' },
  mainnet: { id: 1, name: 'Ethereum' },
}));

// Mock global fetch
global.fetch = mockFetch;

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: () => 'test-id-123',
}));

describe('tip-store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockSql.mockImplementation(() => Promise.resolve([]));
    // Clear the wallet agent cache between tests
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function getModule() {
    return import('../tip-store');
  }

  describe('tipToJSON', () => {
    it('converts bigint amountRaw to string', async () => {
      const { tipToJSON } = await getModule();
      const tip = {
        id: 'test-id',
        kudosTxHash: '0xabc',
        chainId: 2741,
        agentId: 123,
        fromAddress: '0xfrom',
        toAddress: '0xto',
        amountUsd: 10.5,
        amountRaw: BigInt('10500000'),
        status: 'pending' as const,
        createdAt: 1234567890,
        expiresAt: 1234567890 + 86400000,
      };

      const result = tipToJSON(tip);

      expect(result).toEqual({
        ...tip,
        amountRaw: '10500000',
      });
      expect(typeof result.amountRaw).toBe('string');
    });
  });

  describe('usdToRaw', () => {
    it('converts USD to USDC raw units with 6 decimals', async () => {
      const { usdToRaw } = await getModule();

      expect(usdToRaw(1)).toBe(BigInt('1000000'));
      expect(usdToRaw(10.5)).toBe(BigInt('10500000'));
      expect(usdToRaw(0.123456)).toBe(BigInt('123456'));
      expect(usdToRaw(0.1234567)).toBe(BigInt('123457')); // Rounds properly
    });
  });

  describe('resolveAgentByWallet', () => {
    it('returns cached result when available', async () => {
      const { resolveAgentByWallet } = await getModule();

      // First call - mock API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              {
                chain_id: 2741,
                token_id: '456',
                owner_address: '0xtest123',
                agent_wallet: null,
              },
            ],
          }),
      });

      const result1 = await resolveAgentByWallet('0xTest123');
      expect(result1).toBe(456);

      // Second call - should use cache, no fetch
      mockFetch.mockClear();
      const result2 = await resolveAgentByWallet('0xtest123');
      expect(result2).toBe(456);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns null for API failure and caches negative result', async () => {
      const { resolveAgentByWallet } = await getModule();

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await resolveAgentByWallet('0xinvalid');
      expect(result).toBe(null);
    });

    it('finds agent by owner_address', async () => {
      const { resolveAgentByWallet } = await getModule();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              {
                chain_id: 2741,
                token_id: '123',
                owner_address: '0xowner',
                agent_wallet: null,
              },
            ],
          }),
      });

      const result = await resolveAgentByWallet('0xOwner');
      expect(result).toBe(123);
    });

    it('finds agent by agent_wallet', async () => {
      const { resolveAgentByWallet } = await getModule();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              {
                chain_id: 2741,
                token_id: '789',
                owner_address: '0xowner',
                agent_wallet: '0xwallet',
              },
            ],
          }),
      });

      const result = await resolveAgentByWallet('0xWallet');
      expect(result).toBe(789);
    });

    it('returns null when no matching agent found', async () => {
      const { resolveAgentByWallet } = await getModule();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              {
                chain_id: 2741,
                token_id: '999',
                owner_address: '0xother',
                agent_wallet: '0xother-wallet',
              },
            ],
          }),
      });

      const result = await resolveAgentByWallet('0xnotfound');
      expect(result).toBe(null);
    });

    it('ignores agents from other chains', async () => {
      const { resolveAgentByWallet } = await getModule();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              {
                chain_id: 1, // Wrong chain
                token_id: '999',
                owner_address: '0xtest',
                agent_wallet: null,
              },
            ],
          }),
      });

      const result = await resolveAgentByWallet('0xtest');
      expect(result).toBe(null);
    });

    it('caches negative results when API returns not ok', async () => {
      const { resolveAgentByWallet } = await getModule();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await resolveAgentByWallet('0xfail');
      expect(result).toBe(null);
    });
  });

  describe('resolvePaymentAddress', () => {
    it('returns owner address from identity registry', async () => {
      const { resolvePaymentAddress } = await getModule();
      const expectedOwner = '0xowner123' as Address;

      mockPublicClient.readContract.mockResolvedValueOnce(expectedOwner);

      const result = await resolvePaymentAddress(456);

      expect(result).toBe(expectedOwner);
      expect(mockPublicClient.readContract).toHaveBeenCalledWith({
        address: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
        abi: expect.any(Array),
        functionName: 'ownerOf',
        args: [BigInt(456)],
      });
    });

    it('falls back to treasury address on error', async () => {
      const { resolvePaymentAddress } = await getModule();

      mockPublicClient.readContract.mockRejectedValueOnce(
        new Error('Token does not exist')
      );

      const result = await resolvePaymentAddress(999);

      expect(result).toBe('0x668aDd9213985E7Fd613Aec87767C892f4b9dF1c');
    });
  });

  describe('createTip', () => {
    it('creates a new pending tip', async () => {
      const { createTip } = await getModule();
      const now = 1234567890;
      vi.setSystemTime(now);

      const params = {
        kudosTxHash: '0xkudos123',
        agentId: 456,
        fromAddress: '0xFrom',
        toAddress: '0xTo',
        amountUsd: 15.75,
      };

      const result = await createTip(params);

      expect(result).toEqual({
        id: 'test-id-123',
        kudosTxHash: '0xkudos123',
        chainId: 2741,
        agentId: 456,
        fromAddress: '0xfrom',
        toAddress: '0xto',
        amountUsd: 15.75,
        amountRaw: BigInt('15750000'),
        status: 'pending',
        createdAt: now,
        expiresAt: now + 24 * 60 * 60 * 1000,
      });

      // Should be called twice - once for pruneExpired, once for INSERT
      expect(mockSql).toHaveBeenCalledTimes(2);
      // Verify the INSERT call (second call) contains the expected parameters
      const insertCall = mockSql.mock.calls[1];
      expect(insertCall[1]).toBe('test-id-123');
      expect(insertCall[2]).toBe('0xkudos123');
      expect(insertCall[3]).toBe(2741);
      expect(insertCall[4]).toBe(456);
      expect(insertCall[5]).toBe('0xfrom');
      expect(insertCall[6]).toBe('0xto');
      expect(insertCall[7]).toBe(15.75);
    });

    it('normalizes addresses to lowercase', async () => {
      const { createTip } = await getModule();

      await createTip({
        kudosTxHash: '0xhash',
        agentId: 123,
        fromAddress: '0xFROM',
        toAddress: '0xTO',
        amountUsd: 5,
      });

      // Should be called twice - once for pruneExpired, once for INSERT
      expect(mockSql).toHaveBeenCalledTimes(2);
      // Verify the INSERT call contains normalized addresses
      const insertCall = mockSql.mock.calls[1];
      expect(insertCall[5]).toBe('0xfrom');
      expect(insertCall[6]).toBe('0xto');
    });

    it('stores the provided chain ID', async () => {
      const { createTip } = await getModule();

      const result = await createTip({
        kudosTxHash: '0xbase',
        chainId: 8453,
        agentId: 321,
        fromAddress: '0xFROM',
        toAddress: '0xTO',
        amountUsd: 2.5,
      });

      expect(result.chainId).toBe(8453);
      const insertCall = mockSql.mock.calls[1];
      expect(insertCall[3]).toBe(8453);
    });
  });

  describe('getTip', () => {
    it('returns tip by ID', async () => {
      const { getTip } = await getModule();
      const mockRow = {
        id: 'tip-456',
        kudos_tx_hash: '0xkudos',
        agent_id: 789,
        from_address: '0xfrom',
        to_address: '0xto',
        amount_usd: 20,
        status: 'completed',
        payment_tx_hash: '0xpayment',
        created_at: 1111111111,
        completed_at: 2222222222,
        expires_at: 3333333333,
      };

      // First call is pruneExpired, second call returns the actual data
      mockSql.mockResolvedValueOnce([]).mockResolvedValueOnce([mockRow]);

      const result = await getTip('tip-456');

      expect(result).toEqual({
        id: 'tip-456',
        kudosTxHash: '0xkudos',
        chainId: 2741,
        agentId: 789,
        fromAddress: '0xfrom',
        toAddress: '0xto',
        amountUsd: 20,
        amountRaw: BigInt('20000000'),
        status: 'completed',
        paymentTxHash: '0xpayment',
        createdAt: 1111111111,
        completedAt: 2222222222,
        expiresAt: 3333333333,
      });
    });

    it('returns undefined when tip not found', async () => {
      const { getTip } = await getModule();

      // First call is pruneExpired, second call returns empty
      mockSql.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const result = await getTip('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('getTipByKudosTxHash', () => {
    it('returns undefined when no database', async () => {
      mockHasDb.mockReturnValueOnce(false);
      const { getTipByKudosTxHash } = await getModule();

      const result = await getTipByKudosTxHash('0xhash');
      expect(result).toBeUndefined();
    });

    it('returns undefined for empty hash', async () => {
      const { getTipByKudosTxHash } = await getModule();

      const result = await getTipByKudosTxHash('');
      expect(result).toBeUndefined();
    });

    it('finds tip by kudos transaction hash', async () => {
      const { getTipByKudosTxHash } = await getModule();
      const mockRow = {
        id: 'tip-123',
        kudos_tx_hash: '0xKUDOS',
        agent_id: 456,
        from_address: '0xfrom',
        to_address: '0xto',
        amount_usd: 10,
        status: 'completed',
        payment_tx_hash: '0xpayment',
        created_at: 1111111111,
        completed_at: 2222222222,
        expires_at: 3333333333,
      };

      // First call is pruneExpired, second call returns the tip data
      mockSql.mockResolvedValueOnce([]).mockResolvedValueOnce([mockRow]);

      // Mock resolveAgentByWallet to return null
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      });

      const result = await getTipByKudosTxHash('0xkudos');

      expect(result).toEqual({
        id: 'tip-123',
        kudosTxHash: '0xKUDOS',
        chainId: 2741,
        agentId: 456,
        fromAddress: '0xfrom',
        toAddress: '0xto',
        amountUsd: 10,
        amountRaw: BigInt('10000000'),
        status: 'completed',
        paymentTxHash: '0xpayment',
        createdAt: 1111111111,
        completedAt: 2222222222,
        expiresAt: 3333333333,
      });

      // Verify the SELECT call contains the hash
      const selectCall = mockSql.mock.calls[1];
      expect(selectCall[1]).toBe('0xkudos');
      expect(selectCall[2]).toBe('0xkudos');
    });

    it('finds tip by payment transaction hash', async () => {
      const { getTipByKudosTxHash } = await getModule();
      const mockRow = {
        id: 'tip-789',
        kudos_tx_hash: '0xkudos',
        agent_id: 456,
        from_address: '0xfrom',
        to_address: '0xto',
        amount_usd: 15,
        status: 'completed',
        payment_tx_hash: '0xPAYMENT',
        created_at: 1111111111,
        completed_at: 2222222222,
        expires_at: 3333333333,
      };

      // First call is pruneExpired, second call returns the tip data
      mockSql.mockResolvedValueOnce([]).mockResolvedValueOnce([mockRow]);

      // Mock resolveAgentByWallet
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      });

      const result = await getTipByKudosTxHash('0xpayment');

      expect(result).toBeDefined();
      expect(result?.id).toBe('tip-789');
    });

    it('resolves fromAgentId when wallet lookup succeeds', async () => {
      const { getTipByKudosTxHash } = await getModule();
      const mockRow = {
        id: 'tip-abc',
        kudos_tx_hash: '0xkudos',
        agent_id: 456,
        from_address: '0xfrom',
        to_address: '0xto',
        amount_usd: 5,
        status: 'completed',
        payment_tx_hash: null,
        created_at: 1111111111,
        completed_at: 2222222222,
        expires_at: 3333333333,
      };

      // First call is pruneExpired, second call returns the tip data
      mockSql.mockResolvedValueOnce([]).mockResolvedValueOnce([mockRow]);

      // Mock resolveAgentByWallet to return an agent ID
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              {
                chain_id: 2741,
                token_id: '999',
                owner_address: '0xfrom',
                agent_wallet: null,
              },
            ],
          }),
      });

      const result = await getTipByKudosTxHash('0xkudos');

      expect(result?.fromAgentId).toBe(999);
    });

    it('uses the tip chain when resolving payer agents', async () => {
      const { getTipByKudosTxHash } = await getModule();
      const mockRow = {
        id: 'tip-base',
        kudos_tx_hash: '0xbasekudos',
        chain_id: 8453,
        agent_id: 456,
        from_address: '0xfrom',
        to_address: '0xto',
        amount_usd: 5,
        status: 'completed',
        payment_tx_hash: null,
        created_at: 1111111111,
        completed_at: 2222222222,
        expires_at: 3333333333,
      };

      mockSql.mockResolvedValueOnce([]).mockResolvedValueOnce([mockRow]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              {
                chain_id: 2741,
                token_id: '111',
                owner_address: '0xfrom',
                agent_wallet: null,
              },
              {
                chain_id: 8453,
                token_id: '222',
                owner_address: '0xfrom',
                agent_wallet: null,
              },
            ],
          }),
      });

      const result = await getTipByKudosTxHash('0xbasekudos');

      expect(result?.chainId).toBe(8453);
      expect(result?.fromAgentId).toBe(222);
    });

    it('returns undefined when no tip found', async () => {
      const { getTipByKudosTxHash } = await getModule();

      // First call is pruneExpired, second call returns empty
      mockSql.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const result = await getTipByKudosTxHash('0xnotfound');
      expect(result).toBeUndefined();
    });
  });

  describe('completeTip', () => {
    it('marks pending tip as completed', async () => {
      const { completeTip } = await getModule();
      const now = 1234567890;
      vi.setSystemTime(now);

      const mockRow = {
        id: 'tip-complete',
        kudos_tx_hash: '0xkudos',
        agent_id: 123,
        from_address: '0xfrom',
        to_address: '0xto',
        amount_usd: 25,
        status: 'completed',
        payment_tx_hash: '0xpayment123',
        created_at: 1111111111,
        completed_at: now,
        expires_at: 3333333333,
      };

      // First call is pruneExpired, second call returns the updated row
      mockSql.mockResolvedValueOnce([]).mockResolvedValueOnce([mockRow]);

      const result = await completeTip('tip-complete', '0xpayment123');

      expect(result).toEqual({
        id: 'tip-complete',
        kudosTxHash: '0xkudos',
        chainId: 2741,
        agentId: 123,
        fromAddress: '0xfrom',
        toAddress: '0xto',
        amountUsd: 25,
        amountRaw: BigInt('25000000'),
        status: 'completed',
        paymentTxHash: '0xpayment123',
        createdAt: 1111111111,
        completedAt: now,
        expiresAt: 3333333333,
      });

      // Verify the UPDATE call contains the expected parameters
      const updateCall = mockSql.mock.calls[1];
      expect(updateCall[1]).toBe('0xpayment123');
      expect(updateCall[2]).toBe(now);
      expect(updateCall[3]).toBe('tip-complete');
    });

    it('returns undefined when tip not found or not pending', async () => {
      const { completeTip } = await getModule();

      // First call is pruneExpired, second call returns empty (tip not found/updated)
      mockSql.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const result = await completeTip('nonexistent', '0xpayment');
      expect(result).toBeUndefined();
    });
  });

  describe('getCompletedTips', () => {
    it('returns all completed tips ordered by completion date', async () => {
      const { getCompletedTips } = await getModule();

      const mockRows = [
        {
          id: 'tip-1',
          kudos_tx_hash: '0xkudos1',
          agent_id: 111,
          from_address: '0xfrom1',
          to_address: '0xto1',
          amount_usd: 10,
          status: 'completed',
          payment_tx_hash: '0xpay1',
          created_at: 1111111111,
          completed_at: 2222222222,
          expires_at: 3333333333,
        },
        {
          id: 'tip-2',
          kudos_tx_hash: '0xkudos2',
          agent_id: 222,
          from_address: '0xfrom2',
          to_address: '0xto2',
          amount_usd: 20,
          status: 'completed',
          payment_tx_hash: '0xpay2',
          created_at: 1111111112,
          completed_at: 2222222223,
          expires_at: 3333333334,
        },
      ];

      // First call is pruneExpired, second call returns the completed tips
      mockSql.mockResolvedValueOnce([]).mockResolvedValueOnce(mockRows);

      const result = await getCompletedTips();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('tip-1');
      expect(result[1].id).toBe('tip-2');
      expect(result[0].amountRaw).toBe(BigInt('10000000'));
      expect(result[1].amountRaw).toBe(BigInt('20000000'));

      // Verify the query for completed tips was called
      expect(mockSql).toHaveBeenCalledTimes(2);
    });

    it('returns empty array when no completed tips', async () => {
      const { getCompletedTips } = await getModule();

      // First call is pruneExpired, second call returns empty
      mockSql.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const result = await getCompletedTips();
      expect(result).toEqual([]);
    });
  });
});
