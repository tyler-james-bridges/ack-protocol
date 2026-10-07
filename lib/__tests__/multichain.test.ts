import { describe, it, expect, vi, beforeEach } from 'vitest';

const requests: { chainId: number; fromBlock: string; toBlock: string }[] = [];

vi.mock('@/config/chains', () => {
  const makeClient = (chainId: number) => ({
    getBlockNumber: vi.fn().mockResolvedValue(BigInt(32_000_000)),
    request: vi.fn(
      async ({
        params,
      }: {
        params: [{ fromBlock: string; toBlock: string }];
      }) => {
        requests.push({ chainId, ...params[0] });
        return [
          {
            blockNumber: params[0].fromBlock,
            transactionHash: '0xabc',
            data: '0x',
          },
        ];
      }
    ),
  });
  const clients = new Map<number, ReturnType<typeof makeClient>>();
  return {
    SUPPORTED_CHAINS: [
      { chain: { id: 8453, name: 'Base' } },
      { chain: { id: 4663, name: 'Robinhood Chain' } },
    ],
    getPublicClient: (id: number) => {
      if (!clients.has(id)) clients.set(id, makeClient(id));
      return clients.get(id)!;
    },
  };
});

import { fetchCrossChainReputation } from '../multichain';

describe('fetchCrossChainReputation', () => {
  beforeEach(() => {
    requests.length = 0;
  });

  it('splits Robinhood Chain log queries into 10M-block chunks from the registry deploy block', async () => {
    const result = await fetchCrossChainReputation(
      '0x668aDd9213985E7Fd613Aec87767C892f4b9dF1c'
    );

    const rh = requests.filter((r) => r.chainId === 4663);
    expect(rh.map((r) => [BigInt(r.fromBlock), BigInt(r.toBlock)])).toEqual([
      [BigInt(12_058_809), BigInt(22_058_808)],
      [BigInt(22_058_809), BigInt(32_000_000)],
    ]);
    expect(result.find((r) => r.chainId === 4663)?.feedbackCount).toBe(2);
  });

  it('keeps a single open-ended query for other chains', async () => {
    await fetchCrossChainReputation(
      '0x668aDd9213985E7Fd613Aec87767C892f4b9dF1c'
    );
    const baseReqs = requests.filter((r) => r.chainId === 8453);
    expect(baseReqs).toHaveLength(1);
    expect(baseReqs[0].toBlock).toBe('latest');
  });
});
