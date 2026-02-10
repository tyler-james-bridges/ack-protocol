'use client';

import { useReadContract, useReadContracts } from 'wagmi';
import { REPUTATION_REGISTRY_ABI } from '@/config/abi';
import { REPUTATION_REGISTRY_ADDRESS } from '@/config/contract';
import type { KudosCategory } from '@/config/contract';
import { chain } from '@/config/chain';
import type { Address } from 'viem';

const reputationConfig = {
  address: REPUTATION_REGISTRY_ADDRESS,
  abi: REPUTATION_REGISTRY_ABI,
  chainId: chain.id,
} as const;

/**
 * On-chain feedback entry from the Reputation Registry.
 */
export interface OnChainFeedback {
  agentId: number;
  clientAddress: Address;
  feedbackIndex: number;
  value: number;
  valueDecimals: number;
  tag1: string;
  tag2: string;
  isRevoked: boolean;
}

/**
 * Get the number of feedbacks from a specific client for an agent.
 */
export function useFeedbackCount(
  agentId: number | undefined,
  clientAddress: Address | undefined
) {
  return useReadContract({
    ...reputationConfig,
    functionName: 'getFeedbackCount',
    args:
      agentId !== undefined && clientAddress
        ? [BigInt(agentId), clientAddress]
        : undefined,
    query: { enabled: agentId !== undefined && !!clientAddress },
  });
}

/**
 * Get a single feedback entry by index.
 */
export function useFeedback(
  agentId: number | undefined,
  clientAddress: Address | undefined,
  feedbackIndex: number | undefined
) {
  return useReadContract({
    ...reputationConfig,
    functionName: 'getFeedback',
    args:
      agentId !== undefined && clientAddress && feedbackIndex !== undefined
        ? [BigInt(agentId), clientAddress, BigInt(feedbackIndex)]
        : undefined,
    query: {
      enabled:
        agentId !== undefined && !!clientAddress && feedbackIndex !== undefined,
    },
  });
}

/**
 * Batch-fetch all feedbacks from a specific client for an agent.
 * First fetches the count, then multicalls each feedback entry.
 */
export function useAllFeedback(
  agentId: number | undefined,
  clientAddress: Address | undefined
) {
  const countResult = useFeedbackCount(agentId, clientAddress);
  const count = countResult.data ? Number(countResult.data) : 0;

  const contracts =
    agentId !== undefined && clientAddress && count > 0
      ? Array.from({ length: count }, (_, i) => ({
          ...reputationConfig,
          functionName: 'getFeedback' as const,
          args: [BigInt(agentId), clientAddress, BigInt(i)] as const,
        }))
      : [];

  const feedbackResult = useReadContracts({
    contracts,
    query: { enabled: contracts.length > 0 },
  });

  const feedbacks: OnChainFeedback[] =
    feedbackResult.data && agentId !== undefined && clientAddress
      ? feedbackResult.data
          .map((result, i) => {
            if (result.status !== 'success' || !result.result) return null;
            const [value, valueDecimals, tag1, tag2, isRevoked] =
              result.result as [bigint, number, string, string, boolean];
            return {
              agentId,
              clientAddress,
              feedbackIndex: i,
              value: Number(value),
              valueDecimals,
              tag1,
              tag2,
              isRevoked,
            };
          })
          .filter((f): f is OnChainFeedback => f !== null)
      : [];

  return {
    feedbacks,
    count,
    isLoading: countResult.isLoading || feedbackResult.isLoading,
    error: countResult.error || feedbackResult.error,
    refetch: () => {
      countResult.refetch();
      feedbackResult.refetch();
    },
  };
}

/**
 * Parse a tag2 value into a KudosCategory if it matches.
 */
export function parseKudosCategory(tag2: string): KudosCategory | null {
  const categories: KudosCategory[] = [
    'reliability',
    'speed',
    'accuracy',
    'creativity',
    'collaboration',
    'security',
  ];
  return categories.includes(tag2 as KudosCategory)
    ? (tag2 as KudosCategory)
    : null;
}
