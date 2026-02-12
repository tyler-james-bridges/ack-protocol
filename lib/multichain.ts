import { type Address, padHex } from 'viem';
import { SUPPORTED_CHAINS, getPublicClient } from '@/config/chains';
import { REPUTATION_REGISTRY_ADDRESS } from '@/config/contract';

const FEEDBACK_GIVEN_TOPIC =
  '0x6a4a61743519c9d648a14e6493f47dbe3ff1aa29e7785c96c8326a205e58febc';

export interface ChainReputation {
  chainId: number;
  chainName: string;
  feedbackCount: number;
  feedbacks: {
    blockNumber: bigint;
    transactionHash: string;
    data: `0x${string}`;
  }[];
}

export async function fetchCrossChainReputation(
  agentAddress: string
): Promise<ChainReputation[]> {
  const paddedAddress = padHex(agentAddress as Address, { size: 32 });

  const results = await Promise.allSettled(
    SUPPORTED_CHAINS.map(async ({ chain }) => {
      const client = getPublicClient(chain.id);
      const logs = await client.getLogs({
        address: REPUTATION_REGISTRY_ADDRESS,
        topics: [FEEDBACK_GIVEN_TOPIC as `0x${string}`, null, paddedAddress],
        fromBlock: BigInt(0),
        toBlock: 'latest',
      });

      return {
        chainId: chain.id,
        chainName: chain.name,
        feedbackCount: logs.length,
        feedbacks: logs.map((log) => ({
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          data: log.data,
        })),
      } satisfies ChainReputation;
    })
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<ChainReputation> =>
        r.status === 'fulfilled'
    )
    .map((r) => r.value);
}
