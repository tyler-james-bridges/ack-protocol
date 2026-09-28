'use client';

import { useQuery } from '@tanstack/react-query';

export type ChainFeedbackCoverage = {
  status: 'absent' | 'partial' | 'complete';
};

export type ChainFeedbackCounts = {
  counts: Map<number, number>;
  total: number;
  coverage: ChainFeedbackCoverage;
};

function isCoverageStatus(
  value: unknown
): value is ChainFeedbackCoverage['status'] {
  return value === 'absent' || value === 'partial' || value === 'complete';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function fetchChainFeedbackCounts(
  chainId: number
): Promise<ChainFeedbackCounts> {
  const res = await fetch(`/api/feedback?counts=true&chainId=${chainId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch feedback counts: ${res.status}`);
  }
  const data: unknown = await res.json();
  if (!isRecord(data)) {
    throw new Error('Failed to fetch feedback counts');
  }
  const counts = new Map<number, number>();
  if (isRecord(data.counts)) {
    for (const [id, count] of Object.entries(data.counts)) {
      if (typeof count === 'number') counts.set(Number(id), count);
    }
  }
  const coverage = isRecord(data.coverage) ? data.coverage.status : undefined;
  const status = isCoverageStatus(coverage) ? coverage : 'absent';
  const total = typeof data.total === 'number' ? data.total : 0;
  return { counts, total, coverage: { status } };
}

export function useChainFeedbackCounts(chainId: number) {
  return useQuery({
    queryKey: ['feedback-counts', chainId],
    queryFn: () => fetchChainFeedbackCounts(chainId),
    staleTime: 60_000,
    gcTime: 300_000,
  });
}
