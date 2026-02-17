'use client';

import { useQuery } from '@tanstack/react-query';

/**
 * Fetches timestamps for a list of block numbers via server-side cached API.
 * Returns a Map<string, number> of blockNumber -> unix seconds.
 */
export function useBlockTimestamps(blockNumbers: bigint[]) {
  const unique = [...new Set(blockNumbers.map((b) => b.toString()))];
  const key = unique.sort().join(',');

  return useQuery({
    queryKey: ['block-timestamps', key],
    queryFn: async () => {
      const map = new Map<string, number>();
      if (unique.length === 0) return map;

      // Batch up to 50 at a time via server endpoint
      const res = await fetch(`/api/timestamps?blocks=${unique.join(',')}`);
      if (!res.ok) return map;

      const data: Record<string, number> = await res.json();
      for (const [bn, ts] of Object.entries(data)) {
        map.set(bn, ts);
      }
      return map;
    },
    enabled: unique.length > 0,
    staleTime: Infinity,
  });
}

/**
 * Format a unix timestamp as relative time (e.g. "2h ago", "3d ago").
 */
export function formatRelativeTime(unixSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - unixSeconds;

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  const date = new Date(unixSeconds * 1000);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
