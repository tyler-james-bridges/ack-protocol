'use client';

import { useQuery } from '@tanstack/react-query';

export interface StandaloneTip {
  type: 'tip';
  tipId: string;
  agentId: number;
  chainId: number;
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

async function fetchTipsFeed(
  agentId: number,
  chainId: number
): Promise<StandaloneTip[]> {
  const res = await fetch(
    `/api/tips/feed?agentId=${agentId}&chainId=${chainId}&limit=20`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
}

export function useTipsFeed(
  agentId: number | undefined,
  chainId: number | undefined
) {
  return useQuery({
    queryKey: ['tips-feed', agentId, chainId],
    queryFn: () => fetchTipsFeed(agentId!, chainId!),
    enabled: agentId !== undefined && chainId !== undefined,
    staleTime: 60_000,
    gcTime: 300_000,
  });
}
