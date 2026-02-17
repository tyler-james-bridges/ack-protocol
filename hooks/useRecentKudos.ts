'use client';

import { useQuery } from '@tanstack/react-query';
import type { Address, Hex } from 'viem';

export interface RecentKudos {
  sender: Address;
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
      const decoded = decodeURIComponent(feedbackURI.slice(6));
      if (decoded.startsWith('{')) {
        const payload = JSON.parse(decoded);
        return payload.reasoning || payload.message || null;
      }
      return decoded || null;
    }
    if (feedbackURI.startsWith('{')) {
      const payload = JSON.parse(feedbackURI);
      return payload.reasoning || payload.message || null;
    }
  } catch {
    // ignore malformed URIs
  }
  return null;
}

async function fetchRecentKudos(): Promise<RecentKudos[]> {
  const res = await fetch('/api/feedback?limit=50');
  if (!res.ok) throw new Error(`Failed to fetch recent kudos: ${res.status}`);
  const data = await res.json();

  return (data.events || []).map(
    (e: {
      sender: string;
      agentId: number;
      tag1: string;
      tag2: string;
      feedbackURI: string;
      txHash: string;
      blockNumber: string;
    }) => ({
      sender: e.sender as Address,
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

export function useRecentKudos() {
  return useQuery({
    queryKey: ['recent-kudos'],
    queryFn: fetchRecentKudos,
    staleTime: 60_000,
    gcTime: 300_000,
  });
}
