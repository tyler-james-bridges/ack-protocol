'use client';

import Link from 'next/link';
import { useRecentKudos, useLeaderboard, type RecentKudos } from '@/hooks';
import { AgentAvatar } from './agent-avatar';
import { CategoryBadge } from './category-badge';
import { KUDOS_CATEGORIES, type KudosCategory } from '@/config/contract';
import type { ScanAgent } from '@/lib/api';

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}\u2009..\u2009${addr.slice(-4)}`;
}

function FeedItem({ kudos, agent }: { kudos: RecentKudos; agent?: ScanAgent }) {
  const isValidCategory = KUDOS_CATEGORIES.includes(
    kudos.tag2 as KudosCategory
  );
  const name = agent?.name || `Agent #${kudos.agentId}`;

  return (
    <div className="flex gap-3 px-4 py-3 border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors">
      <Link href={`/agent/2741/${kudos.agentId}`} className="shrink-0 mt-0.5">
        <AgentAvatar name={name} imageUrl={agent?.image_url} size={32} />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                href={`/agent/2741/${kudos.agentId}`}
                className="text-sm font-semibold truncate hover:text-[#00DE73] transition-colors"
              >
                {name}
              </Link>
              {isValidCategory && (
                <CategoryBadge category={kudos.tag2 as KudosCategory} />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              from{' '}
              <a
                href={`https://abscan.org/address/${kudos.sender}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono hover:text-[#00DE73] transition-colors"
              >
                {truncateAddress(kudos.sender)}
              </a>
            </p>
          </div>
          <a
            href={`https://abscan.org/tx/${kudos.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-muted-foreground/50 hover:text-[#00DE73] transition-colors shrink-0 mt-0.5"
          >
            tx
          </a>
        </div>

        {kudos.message && (
          <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2 leading-relaxed">
            &ldquo;{kudos.message}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}

export function LiveKudosFeed() {
  const { data: kudos, isLoading } = useRecentKudos();
  // Reuses the same query key as the home page hero — shared React Query cache
  const { data: agents } = useLeaderboard({
    limit: 50,
    chainId: 2741,
    sortBy: 'total_score',
  });

  // Build agent lookup: tokenId → ScanAgent
  const agentMap = new Map<number, ScanAgent>();
  if (agents) {
    for (const agent of agents) {
      agentMap.set(Number(agent.token_id), agent);
    }
  }

  const recent = kudos?.slice(0, 15);

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card/50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00DE73] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00DE73]" />
          </span>
          <h2 className="text-sm font-bold uppercase tracking-wider">
            Latest Kudos
          </h2>
        </div>
        <Link
          href="/kudos"
          className="text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          View all →
        </Link>
      </div>

      {/* Feed list */}
      <div className="overflow-y-auto no-scrollbar max-h-[420px] lg:max-h-[480px]">
        {isLoading ? (
          <div className="space-y-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex gap-3 px-4 py-3 border-b border-border/50"
              >
                <div className="w-8 h-8 rounded-lg bg-muted/40 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-muted/40 rounded w-2/3 animate-pulse" />
                  <div className="h-3 bg-muted/40 rounded w-1/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : !recent?.length ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No kudos yet — be the first!
            </p>
          </div>
        ) : (
          recent.map((k, i) => (
            <FeedItem
              key={`${k.txHash}-${i}`}
              kudos={k}
              agent={agentMap.get(k.agentId)}
            />
          ))
        )}
      </div>
    </div>
  );
}
