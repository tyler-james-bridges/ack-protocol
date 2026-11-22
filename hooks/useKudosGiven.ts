'use client';

import { readFeedback } from '@/packages/sdk/src/feedback-uri';
import { useQuery } from '@tanstack/react-query';
import type { Address, Hex } from 'viem';
import { DEFAULT_8004_CHAIN_ID } from '@/config/chain';

export interface KudosGivenEvent {
  agentId: number;
  chainId: number;
  sender: string;
  tag1: string;
  tag2: string;
  message: string | null;
  txHash: Hex;
  blockNumber: bigint;
}

async function fetchKudosGiven(address: Address): Promise<KudosGivenEvent[]> {
  const res = await fetch(
    `/api/feedback?sender=${address.toLowerCase()}&limit=500`
  );
  if (!res.ok) throw new Error(`Failed to fetch kudos given: ${res.status}`);
  const data = await res.json();

  return (data.events || []).map(
    (e: {
      agentId: number;
      chainId?: number;
      sender: string;
      tag1: string;
      tag2: string;
      feedbackURI: string;
      txHash: string;
      blockNumber: string;
    }) => ({
      agentId: e.agentId,
      chainId: e.chainId ?? DEFAULT_8004_CHAIN_ID,
      sender: e.sender || address.toLowerCase(),
      tag1: e.tag1,
      tag2: e.tag2,
      message: readFeedback(e.feedbackURI).message,
      txHash: e.txHash as Hex,
      blockNumber: BigInt(e.blockNumber),
    })
  );
}

export function useKudosGiven(address: Address | undefined) {
  return useQuery({
    queryKey: ['kudos-given', address],
    queryFn: () => fetchKudosGiven(address!),
    enabled: !!address,
    staleTime: 60_000,
    gcTime: 300_000,
  });
}
