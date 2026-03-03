'use client';

import { useQuery } from '@tanstack/react-query';
import type { StreakData } from '@/lib/streaks';

async function fetchStreak(address: string): Promise<StreakData> {
  const res = await fetch(`/api/streaks/${address}`);
  if (!res.ok) throw new Error(`Failed to fetch streak: ${res.status}`);
  return res.json();
}

async function fetchStreaksBulk(
  addresses: string[]
): Promise<Record<string, StreakData>> {
  if (addresses.length === 0) return {};
  const res = await fetch(`/api/streaks?addresses=${addresses.join(',')}`);
  if (!res.ok) throw new Error(`Failed to fetch streaks: ${res.status}`);
  return res.json();
}

async function fetchTopStreakers(
  limit: number
): Promise<{ address: string; streak: StreakData }[]> {
  const res = await fetch(`/api/streaks?top=${limit}`);
  if (!res.ok) throw new Error(`Failed to fetch top streakers: ${res.status}`);
  const data = await res.json();
  return data.streakers || [];
}

export function useStreak(address: string | undefined) {
  return useQuery<StreakData>({
    queryKey: ['streak', address],
    queryFn: () => fetchStreak(address!),
    enabled: !!address,
    staleTime: 60_000,
  });
}

export function useStreaksBulk(addresses: string[]) {
  const key = [...addresses].sort().join(',');
  return useQuery<Record<string, StreakData>>({
    queryKey: ['streaks-bulk', key],
    queryFn: () => fetchStreaksBulk(addresses),
    enabled: addresses.length > 0,
    staleTime: 60_000,
  });
}

export function useTopStreakers(limit: number = 20) {
  return useQuery<{ address: string; streak: StreakData }[]>({
    queryKey: ['top-streakers', limit],
    queryFn: () => fetchTopStreakers(limit),
    staleTime: 60_000,
  });
}
