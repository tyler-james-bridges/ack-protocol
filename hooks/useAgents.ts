'use client';

import { useQuery } from '@tanstack/react-query';
import {
  fetchAgents,
  fetchAgentsByChain,
  fetchLeaderboard,
  fetchAgentFeedback,
  type ScanAgent,
  type FetchAgentsOptions,
} from '@/lib/api';
import { ABSTRACT_CHAIN_ID } from '@/config/chain';

/**
 * Fetch a paginated list of agents from 8004scan.
 */
export function useAgents(options: FetchAgentsOptions = {}) {
  return useQuery({
    queryKey: ['agents', options],
    queryFn: () => fetchAgents(options),
    staleTime: 30_000,
  });
}

/**
 * Fetch agents on Abstract mainnet.
 */
export function useAbstractAgents(
  options: Omit<FetchAgentsOptions, 'chainId'> = {}
) {
  return useQuery({
    queryKey: ['agents', 'abstract', options],
    queryFn: () => fetchAgentsByChain(ABSTRACT_CHAIN_ID, options),
    staleTime: 30_000,
  });
}

/**
 * Fetch the global leaderboard.
 */
export function useLeaderboard(
  options: { limit?: number; chainId?: number; sortBy?: string } = {}
) {
  return useQuery({
    queryKey: ['leaderboard', options],
    queryFn: () => fetchLeaderboard(options),
    staleTime: 60_000,
  });
}

/**
 * Fetch feedback for a specific agent.
 */
export function useAgentFeedback(chainId: number, tokenId: string | undefined) {
  return useQuery({
    queryKey: ['feedback', chainId, tokenId],
    queryFn: () => fetchAgentFeedback(chainId, tokenId!),
    enabled: !!tokenId,
    staleTime: 30_000,
  });
}

/**
 * Search agents by name or description.
 */
export function useAgentSearch(query: string) {
  return useQuery({
    queryKey: ['agents', 'search', query],
    queryFn: () => fetchAgents({ search: query, limit: 20 }),
    enabled: query.length >= 2,
    staleTime: 15_000,
  });
}

/**
 * Get chain display name from chain ID.
 */
export function getChainName(chainId: number): string {
  const chains: Record<number, string> = {
    1: 'Ethereum',
    137: 'Polygon',
    56: 'BNB Chain',
    8453: 'Base',
    143: 'Monad',
    167000: 'Taiko',
    100: 'Gnosis',
    59144: 'Linea',
    42220: 'Celo',
    42161: 'Arbitrum',
    534352: 'Scroll',
    43114: 'Avalanche',
    10: 'Optimism',
    2741: 'Abstract',
    196: 'XLayer',
  };
  return chains[chainId] || `Chain ${chainId}`;
}
