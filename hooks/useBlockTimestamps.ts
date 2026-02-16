'use client';

import { useQuery } from '@tanstack/react-query';
import { createPublicClient, http } from 'viem';
import { abstract } from 'viem/chains';

const client = createPublicClient({ chain: abstract, transport: http() });

/**
 * Fetches timestamps for a list of block numbers.
 * Returns a Map<bigint, number> of blockNumber -> unix seconds.
 * Deduplicates and caches the batch.
 */
export function useBlockTimestamps(blockNumbers: bigint[]) {
  const unique = [...new Set(blockNumbers.map((b) => b.toString()))];
  const key = unique.sort().join(',');

  return useQuery({
    queryKey: ['block-timestamps', key],
    queryFn: async () => {
      const map = new Map<string, number>();
      await Promise.all(
        unique.map(async (bn) => {
          try {
            const block = await client.getBlock({ blockNumber: BigInt(bn) });
            map.set(bn, Number(block.timestamp));
          } catch {
            // skip failed lookups
          }
        })
      );
      return map;
    },
    enabled: unique.length > 0,
    staleTime: Infinity, // block timestamps never change
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
