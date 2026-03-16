'use client';

import { useQuery } from '@tanstack/react-query';

export interface StandaloneTip {
  type: 'tip';
  tipId: string;
  agentId: number;
  amountUsd: number;
  fromAddress: string;
  fromAgent: {
    name: string;
    imageUrl: string | null;
    chainId: number;
    tokenId: string;
  } | null;
  paymentTxHash: string | null;
  completedAt: number;
}

async function fetchTipsFeed(agentId: number): Promise<StandaloneTip[]> {
  const res = await fetch(`/api/tips/feed?agentId=${agentId}&limit=20`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
}

export function useTipsFeed(agentId: number | undefined) {
  return useQuery({
    queryKey: ['tips-feed', agentId],
    queryFn: () => fetchTipsFeed(agentId!),
    enabled: agentId !== undefined,
    staleTime: 60_000,
    gcTime: 300_000,
  });
}
