'use client';

import { useQuery } from '@tanstack/react-query';
import { createPublicClient, http, numberToHex, type Hex } from 'viem';
import { abstract } from 'viem/chains';

const REPUTATION_REGISTRY =
  '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63' as const;

// NewFeedback event topic
const NEW_FEEDBACK_TOPIC =
  '0x6a4a61743519c9d648a14e6493f47dbe3ff1aa29e7785c96c8326a205e58febc' as const;

const client = createPublicClient({ chain: abstract, transport: http() });

/**
 * Fetch ALL feedback events on Abstract and return a map of agentTokenId -> count.
 * Single RPC call, cached for 60s.
 */
async function fetchFeedbackCounts(): Promise<Map<number, number>> {
  const currentBlock = await client.getBlockNumber();
  // Scan last 100k blocks (covers several days on Abstract)
  const fromBlock =
    currentBlock > BigInt(100000) ? currentBlock - BigInt(100000) : BigInt(0);

  const logs = await client.request({
    method: 'eth_getLogs',
    params: [
      {
        address: REPUTATION_REGISTRY,
        topics: [NEW_FEEDBACK_TOPIC],
        fromBlock: numberToHex(fromBlock),
        toBlock: numberToHex(currentBlock),
      },
    ],
  });

  const counts = new Map<number, number>();

  for (const log of logs as Array<{ topics: Hex[] }>) {
    // topic[1] is the indexed agentId (uint256, padded to 32 bytes)
    const agentId = Number(BigInt(log.topics[1]));
    counts.set(agentId, (counts.get(agentId) || 0) + 1);
  }

  return counts;
}

/**
 * Returns a map of Abstract agent tokenId -> onchain feedback count.
 * Uses a single eth_getLogs call to count all NewFeedback events.
 */
export function useAbstractFeedbackCounts() {
  return useQuery({
    queryKey: ['abstract-feedback-counts'],
    queryFn: fetchFeedbackCounts,
    staleTime: 60_000,
    gcTime: 300_000,
  });
}
