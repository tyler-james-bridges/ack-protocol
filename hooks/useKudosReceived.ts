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

function mapEvent(e: {
  sender: string;
  feedbackIndex: string;
  value: string;
  tag1: string;
  tag2: string;
  feedbackURI: string;
  feedbackHash: string;
  blockNumber: string;
  txHash: string;
}): KudosEvent {
  return {
    sender: e.sender as Address,
    feedbackIndex: BigInt(e.feedbackIndex),
    value: BigInt(e.value),
    tag1: e.tag1,
    tag2: e.tag2,
    feedbackURI: e.feedbackURI,
    feedbackHash: e.feedbackHash as Hex,
    blockNumber: BigInt(e.blockNumber),
    txHash: e.txHash as Hex,
  };
}

async function fetchKudos(
  agentId: number,
  chainId?: number,
  linkedHandles?: string[]
): Promise<KudosEvent[]> {
  const params = new URLSearchParams({
    agentId: String(agentId),
    limit: '500',
  });
  if (chainId !== undefined) params.set('chainId', String(chainId));
  const res = await fetch(`/api/feedback?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch kudos: ${res.status}`);
  const data = await res.json();

  const events: KudosEvent[] = (data.events || []).map(mapEvent);

  // Also fetch proxy kudos for linked handles
  if (linkedHandles && linkedHandles.length > 0) {
    const proxyResults = await Promise.all(
      linkedHandles.map(async (handle) => {
        const r = await fetch(
          `/api/feedback?handle=${encodeURIComponent(handle)}&limit=500${
            chainId !== undefined ? `&chainId=${chainId}` : ''
          }`
        );
        if (!r.ok) return [];
        const d = await r.json();
        return (d.events || []).map(mapEvent);
      })
    );

    // Merge and deduplicate by txHash
    const seen = new Set(events.map((e) => e.txHash));
    for (const proxyEvents of proxyResults) {
      for (const e of proxyEvents) {
        if (!seen.has(e.txHash)) {
          seen.add(e.txHash);
          events.push(e);
        }
      }
    }

    // Re-sort by blockNumber descending
    events.sort((a, b) => (b.blockNumber > a.blockNumber ? 1 : -1));
  }

  return events;
}

export function useKudosReceived(
  agentId: number | undefined,
  chainId?: number,
  linkedHandles?: string[]
) {
  return useQuery({
    queryKey: ['kudos-received', agentId, chainId, linkedHandles],
    queryFn: () => fetchKudos(agentId!, chainId, linkedHandles),
    enabled: agentId !== undefined,
    staleTime: 60_000,
    gcTime: 300_000,
  });
}
