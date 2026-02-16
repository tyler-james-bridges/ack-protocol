import { type Address, padHex, numberToHex } from 'viem';
import { SUPPORTED_CHAINS, getPublicClient } from '@/config/chains';
import { REPUTATION_REGISTRY_ADDRESS } from '@/config/contract';

/**
 * Approximate deployment blocks for ERC-8004 contracts per chain.
 * Avoids scanning from block 0 which is slow and may hit RPC limits.
 */
const DEPLOYMENT_BLOCKS: Record<number, bigint> = {
  1: BigInt(21000000), // Ethereum mainnet (late 2024)
  8453: BigInt(20000000), // Base
  56: BigInt(44000000), // BNB Chain
  100: BigInt(37000000), // Gnosis
  2741: BigInt(1000000), // Abstract
  42220: BigInt(28000000), // Celo
  42161: BigInt(250000000), // Arbitrum
  10: BigInt(125000000), // Optimism
  137: BigInt(62000000), // Polygon
  534352: BigInt(10000000), // Scroll
  43114: BigInt(50000000), // Avalanche
  59144: BigInt(10000000), // Linea
  167000: BigInt(500000), // Taiko
  196: BigInt(1000000), // XLayer
};

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
      const deployBlock = DEPLOYMENT_BLOCKS[chain.id] ?? BigInt(0);
      const logs = (await client.request({
        method: 'eth_getLogs',
        params: [
          {
            address: REPUTATION_REGISTRY_ADDRESS,
            topics: [
              FEEDBACK_GIVEN_TOPIC as `0x${string}`,
              null,
              paddedAddress,
            ],
            fromBlock: numberToHex(deployBlock),
            toBlock: 'latest',
          },
        ],
      })) as {
        blockNumber: `0x${string}`;
        transactionHash: `0x${string}`;
        data: `0x${string}`;
      }[];

      return {
        chainId: chain.id,
        chainName: chain.name,
        feedbackCount: logs.length,
        feedbacks: logs.map((log) => ({
          blockNumber: BigInt(log.blockNumber),
          transactionHash: log.transactionHash as string,
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
