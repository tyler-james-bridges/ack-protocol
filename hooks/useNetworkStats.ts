'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchNetworkStats, type NetworkStats } from '@/components/stats-card';

export function useNetworkStats() {
  return useQuery<NetworkStats>({
    queryKey: ['network-stats'],
    queryFn: fetchNetworkStats,
    staleTime: 120_000,
  });
}
