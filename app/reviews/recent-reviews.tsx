'use client';

import { useState, useEffect, useCallback } from 'react';

const CHAIN_COLORS: Record<number, string> = {
  1: '#627EEA',
  2741: '#00D4AA',
  8453: '#0052FF',
  42220: '#FCFF52',
};

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  2741: 'Abstract',
  8453: 'Base',
  42220: 'Celo',
};

interface Review {
  name: string;
  chainId: number;
  chainName: string;
  tokenId: number;
  rating: number;
  txHash: string;
  explorerUrl: string;
  date?: string;
  review: string;
}

const POLL_INTERVAL = 30_000; // 30 seconds

export function RecentReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch('/api/reviews?recentLimit=30', {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.recent?.length) {
        setReviews(data.recent);
        setLastUpdated(new Date());
      }
    } catch {
      // Silently fail, keep existing data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
    const interval = setInterval(fetchReviews, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchReviews]);

  const shown = expanded ? reviews : reviews.slice(0, 8);

  if (loading && reviews.length === 0) {
    return (
      <div className="border-2 border-black dark:border-neutral-800 bg-card p-8 text-center">
        <div className="text-xs font-mono text-muted-foreground animate-pulse">
          LOADING LIVE REVIEWS...
        </div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="border-2 border-black dark:border-neutral-800 bg-card p-8 text-center">
        <div className="text-xs font-mono text-muted-foreground">
          NO REVIEWS AVAILABLE
        </div>
      </div>
    );
  }

  return (
    <div className="border-2 border-black dark:border-neutral-800 bg-card">
      {/* Live indicator */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800/30">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[10px] font-mono text-emerald-500 tracking-wider">
            LIVE
          </span>
        </div>
        {lastUpdated && (
          <span className="text-[9px] font-mono text-muted-foreground">
            UPDATED {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_80px_60px_100px] sm:grid-cols-[1fr_100px_70px_140px] gap-2 px-4 py-2.5 border-b-2 border-black dark:border-neutral-800 text-[10px] font-mono font-bold tracking-wider text-muted-foreground">
        <span>AGENT</span>
        <span>CHAIN</span>
        <span className="text-right">RATING</span>
        <span className="text-right">TX PROOF</span>
      </div>

      {/* Rows */}
      {shown.map((r, i) => (
        <div
          key={r.txHash}
          className={`grid grid-cols-[1fr_80px_60px_100px] sm:grid-cols-[1fr_100px_70px_140px] gap-2 px-4 py-2.5 items-center text-xs font-mono ${
            i < shown.length - 1 ? 'border-b border-neutral-800/50' : ''
          } hover:bg-muted/20 transition-colors`}
        >
          {/* Agent name */}
          <div className="truncate font-medium">{r.name}</div>

          {/* Chain badge */}
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 inline-block shrink-0"
              style={{ backgroundColor: CHAIN_COLORS[r.chainId] ?? '#888' }}
            />
            <span
              className="text-[10px] uppercase tracking-wider"
              style={{ color: CHAIN_COLORS[r.chainId] ?? '#888' }}
            >
              {CHAIN_NAMES[r.chainId] ?? 'Unknown'}
            </span>
          </div>

          {/* Rating */}
          <div className="text-right text-emerald-500 font-bold">
            {r.rating}/100
          </div>

          {/* TX link */}
          <div className="text-right">
            <a
              href={r.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-muted-foreground hover:text-emerald-500 transition-colors inline-flex items-center gap-1"
            >
              {r.txHash.slice(0, 8)}…{r.txHash.slice(-4)}
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>
        </div>
      ))}

      {/* Show more / less */}
      {reviews.length > 8 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2.5 text-[11px] font-mono font-bold tracking-wider text-muted-foreground hover:text-emerald-500 transition-colors border-t-2 border-black dark:border-neutral-800 uppercase"
        >
          {expanded
            ? '↑ SHOW LESS'
            : `↓ SHOW ALL ${reviews.length} RECENT REVIEWS`}
        </button>
      )}
    </div>
  );
}
