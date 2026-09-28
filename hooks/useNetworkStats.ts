'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchNetworkStats, type NetworkStats } from '@/components/stats-card';
import { DEFAULT_8004_CHAIN_ID } from '@/config/chain';

export function useNetworkStats(chainId: number = DEFAULT_8004_CHAIN_ID) {
  return useQuery<NetworkStats>({
    queryKey: ['network-stats', chainId],
    queryFn: () => fetchNetworkStats(chainId),
    staleTime: 120_000,
  });
}
