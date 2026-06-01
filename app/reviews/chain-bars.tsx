'use client';

import { useEffect, useState } from 'react';
import type { ChainReviewStats } from './review-data';

interface Props {
  chains: ChainReviewStats[];
}

export function ChainBars({ chains }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  const sorted = [...chains].sort((a, b) => b.count - a.count);
  const maxCount = Math.max(...sorted.map((c) => c.count));

  return (
    <div className="border-2 border-black dark:border-neutral-800 bg-card p-4 sm:p-6 space-y-3">
      {sorted.map((chain) => (
        <div key={chain.id} className="flex items-center gap-3">
          <div
            className="w-20 text-right text-xs font-mono font-bold uppercase tracking-wider shrink-0"
            style={{ color: chain.color }}
          >
            {chain.name}
          </div>
          <div className="flex-1 h-8 bg-muted/30 relative overflow-hidden">
            <div
              className="h-full flex items-center pl-2.5 transition-all duration-[1500ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{
                width: mounted ? `${(chain.count / maxCount) * 100}%` : '0%',
                backgroundColor: chain.color,
              }}
            >
              <span className="text-[10px] font-mono font-bold text-black whitespace-nowrap">
                {chain.uniqueAgents} AGENTS
              </span>
            </div>
          </div>
          <div className="w-10 text-right text-sm font-mono font-bold shrink-0">
            {chain.count}
          </div>
        </div>
      ))}
    </div>
  );
}
