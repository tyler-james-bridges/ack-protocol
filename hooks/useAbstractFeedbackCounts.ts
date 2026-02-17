'use client';

import { useQuery } from '@tanstack/react-query';

/**
 * Returns a map of Abstract agent tokenId -> onchain feedback count.
 * Uses the server-side cached /api/feedback?counts=true endpoint
 * instead of scanning millions of blocks client-side.
 */
async function fetchFeedbackCounts(): Promise<Map<number, number>> {
  const res = await fetch('/api/feedback?counts=true');
  if (!res.ok) throw new Error(`Failed to fetch feedback counts: ${res.status}`);
  const data: Record<string, number> = await res.json();

  const counts = new Map<number, number>();
  for (const [id, count] of Object.entries(data)) {
    counts.set(Number(id), count);
  }
  return counts;
}

export function useAbstractFeedbackCounts() {
  return useQuery({
    queryKey: ['abstract-feedback-counts'],
    queryFn: fetchFeedbackCounts,
    staleTime: 60_000,
    gcTime: 300_000,
  });
}
