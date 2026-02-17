'use client';

import { useQuery } from '@tanstack/react-query';
import type { Address, Hex } from 'viem';

export interface KudosEvent {
  sender: Address;
  feedbackIndex: bigint;
  value: bigint;
  tag1: string;
  tag2: string;
  feedbackURI: string;
  feedbackHash: Hex;
  blockNumber: bigint;
  txHash: Hex;
}

async function fetchKudos(agentId: number): Promise<KudosEvent[]> {
  const res = await fetch(`/api/feedback?agentId=${agentId}&limit=500`);
  if (!res.ok) throw new Error(`Failed to fetch kudos: ${res.status}`);
  const data = await res.json();

  return (data.events || []).map(
    (e: {
      sender: string;
      feedbackIndex: string;
      value: string;
      tag1: string;
      tag2: string;
      feedbackURI: string;
      feedbackHash: string;
      blockNumber: string;
      txHash: string;
    }) => ({
      sender: e.sender as Address,
      feedbackIndex: BigInt(e.feedbackIndex),
      value: BigInt(e.value),
      tag1: e.tag1,
      tag2: e.tag2,
      feedbackURI: e.feedbackURI,
      feedbackHash: e.feedbackHash as Hex,
      blockNumber: BigInt(e.blockNumber),
      txHash: e.txHash as Hex,
    })
  );
}

export function useKudosReceived(agentId: number | undefined) {
  return useQuery({
    queryKey: ['kudos-received', agentId],
    queryFn: () => fetchKudos(agentId!),
    enabled: agentId !== undefined,
    staleTime: 60_000,
    gcTime: 300_000,
  });
}
