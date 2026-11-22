'use client';

import { readFeedback } from '@/packages/sdk/src/feedback-uri';
import { useQuery } from '@tanstack/react-query';
import type { Address, Hex } from 'viem';
import { DEFAULT_8004_CHAIN_ID } from '@/config/chain';

export interface RecentKudos {
  sender: Address;
  agentId: number;
  chainId: number;
  tag1: string;
  tag2: string;
  message: string | null;
  txHash: Hex;
  blockNumber: bigint;
}

async function fetchRecentKudos(chainId: number): Promise<RecentKudos[]> {
  const res = await fetch(`/api/feedback?limit=50&chainId=${chainId}`);
  if (!res.ok) throw new Error(`Failed to fetch recent kudos: ${res.status}`);
  const data = await res.json();

  return (data.events || []).map(
    (e: {
      sender: string;
      agentId: number;
      chainId: number;
      tag1: string;
      tag2: string;
      feedbackURI: string;
      txHash: string;
      blockNumber: string;
    }) => ({
      sender: e.sender as Address,
      agentId: e.agentId,
      chainId: e.chainId,
      tag1: e.tag1,
      tag2: e.tag2,
      message: readFeedback(e.feedbackURI).message,
      txHash: e.txHash as Hex,
      blockNumber: BigInt(e.blockNumber),
    })
  );
}

export function useRecentKudos(chainId: number = DEFAULT_8004_CHAIN_ID) {
  return useQuery({
    queryKey: ['recent-kudos', chainId],
    queryFn: () => fetchRecentKudos(chainId),
    staleTime: 60_000,
    gcTime: 300_000,
  });
}
