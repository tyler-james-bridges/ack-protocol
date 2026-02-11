'use client';

import { useQuery } from '@tanstack/react-query';
import { createPublicClient, http, parseAbiItem, type Address } from 'viem';
import { abstract } from 'viem/chains';

const REPUTATION_REGISTRY =
  '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63' as const;

export interface KudosEvent {
  sender: Address;
  value: bigint;
  tag1: string;
  tag2: string;
  feedbackURI: string;
  feedbackHash: string;
  blockNumber: bigint;
  txHash: string;
}

const client = createPublicClient({ chain: abstract, transport: http() });

async function fetchKudos(agentId: number): Promise<KudosEvent[]> {
  const currentBlock = await client.getBlockNumber();
  const fromBlock = currentBlock > BigInt(10000) ? currentBlock - BigInt(10000) : BigInt(0);

  const logs = await client.getLogs({
    address: REPUTATION_REGISTRY,
    event: parseAbiItem(
      'event FeedbackGiven(uint256 indexed agentId, address indexed sender, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)'
    ),
    args: { agentId: BigInt(agentId) },
    fromBlock,
    toBlock: currentBlock,
  });

  return logs
    .filter((log) => log.args.tag1 === 'kudos')
    .map((log) => ({
      sender: log.args.sender!,
      value: log.args.value!,
      tag1: log.args.tag1!,
      tag2: log.args.tag2!,
      feedbackURI: log.args.feedbackURI!,
      feedbackHash: log.args.feedbackHash!,
      blockNumber: log.blockNumber,
      txHash: log.transactionHash,
    }));
}

export function useKudosReceived(agentId: number | undefined) {
  return useQuery({
    queryKey: ['kudos-received', agentId],
    queryFn: () => fetchKudos(agentId!),
    enabled: agentId !== undefined,
    staleTime: 60_000,
  });
}
