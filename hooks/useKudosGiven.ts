'use client';

import { useQuery } from '@tanstack/react-query';
import type { Address, Hex } from 'viem';

export interface KudosGivenEvent {
  agentId: number;
  tag1: string;
  tag2: string;
  message: string | null;
  feedbackURI: string;
  txHash: Hex;
  blockNumber: bigint;
}

function parseMessage(feedbackURI: string): string | null {
  try {
    if (feedbackURI.startsWith('data:application/json;base64,')) {
      const json = decodeURIComponent(
        escape(atob(feedbackURI.replace('data:application/json;base64,', '')))
      );
      const payload = JSON.parse(json);
      return payload.reasoning || payload.message || null;
    }
    if (feedbackURI.startsWith('data:,')) {
      return decodeURIComponent(feedbackURI.slice(6)) || null;
    }
  } catch {
    // ignore malformed URIs
  }
  return null;
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
      tag1: string;
      tag2: string;
      feedbackURI: string;
      txHash: string;
      blockNumber: string;
    }) => ({
      agentId: e.agentId,
      tag1: e.tag1,
      tag2: e.tag2,
      message: parseMessage(e.feedbackURI),
      feedbackURI: e.feedbackURI,
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
