'use client';

import { useState, useEffect, useCallback } from 'react';

interface ChainStat {
  id: number;
  name: string;
  color: string;
  count: number;
  uniqueAgents: number;
}

interface StatsData {
  total: number;
  chains: ChainStat[];
}

const POLL_INTERVAL = 30_000;

export function LiveStats({
  fallbackTotal,
  fallbackChainCount,
  fallbackAgents,
  fallbackDays,
}: {
  fallbackTotal: number;
  fallbackChainCount: number;
  fallbackAgents: number;
  fallbackDays: number;
}) {
  const [stats, setStats] = useState<StatsData | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/reviews?recentLimit=1', {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.stats) setStats(data.stats);
    } catch {
      // Keep fallback
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const total = stats?.total ?? fallbackTotal;
  const chainCount = stats?.chains.length ?? fallbackChainCount;
  const agents = stats
    ? stats.chains.reduce((s, c) => s + c.uniqueAgents, 0)
    : fallbackAgents;

  const statItems = [
    { value: total, label: 'TOTAL REVIEWS' },
    { value: chainCount, label: 'CHAINS' },
    { value: agents, label: 'AGENTS REVIEWED' },
    { value: fallbackDays, label: 'ACTIVE DAYS' },
  ];

  return (
    <>
      {/* Subtitle with live count */}
      <p className="text-muted-foreground font-mono text-sm mt-2">
        {total} on-chain reviews across {chainCount} chains — every one
        verifiable
      </p>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 mb-10">
        {statItems.map((s) => (
          <div
            key={s.label}
            className="border-2 border-black dark:border-neutral-800 bg-card p-4 text-center hover:border-emerald-500 transition-colors"
          >
            <div className="text-2xl sm:text-3xl font-mono font-bold text-emerald-500">
              {s.value}
            </div>
            <div className="text-[10px] font-mono text-muted-foreground tracking-wider mt-1">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
