'use client';

import Link from 'next/link';
import {
  useRecentKudos,
  useLeaderboard,
  useIsAgent,
  useStreaksBulk,
  type RecentKudos,
} from '@/hooks';
import { AgentAvatar } from './agent-avatar';
import { CategoryBadge } from './category-badge';
import { StreakBadge } from './streak-badge';
import { KUDOS_CATEGORIES, type KudosCategory } from '@/config/contract';
import { IdentityBadge } from './identity-badge';
import {
  useBlockTimestamps,
  formatRelativeTime,
} from '@/hooks/useBlockTimestamps';
import type { ScanAgent } from '@/lib/api';

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}\u2009..\u2009${addr.slice(-4)}`;
}

function FeedItem({
  kudos,
  agent,
  senderAgent,
  timestamp,
  isSenderAgent,
  senderStreak,
}: {
  kudos: RecentKudos;
  agent?: ScanAgent;
  senderAgent?: ScanAgent;
  timestamp?: number;
  isSenderAgent: boolean;
  senderStreak?: { currentStreak: number; isActiveToday: boolean };
}) {
  const isValidCategory = KUDOS_CATEGORIES.includes(
    kudos.tag2 as KudosCategory
  );
  const name = agent?.name || `Agent #${kudos.agentId}`;
  const senderName = senderAgent?.name || kudos.sender;

  const senderLink = senderAgent
    ? `/agent/${senderAgent.chain_id}/${senderAgent.token_id}`
    : `/address/${kudos.sender}`;

  return (
    <div className="flex gap-3 px-4 py-3 border-b border-black/20/50 last:border-b-0 hover:bg-black/5/20 transition-colors">
      <Link href={senderLink} className="shrink-0 mt-0.5">
        <AgentAvatar
          name={senderName}
          imageUrl={senderAgent?.image_url}
          size={32}
        />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <Link
              href={senderLink}
              className={`text-xs hover:text-black transition-colors ${senderAgent ? 'font-semibold text-black' : 'font-mono text-black/50'}`}
            >
              {senderAgent ? senderAgent.name : truncateAddress(kudos.sender)}
            </Link>
            <IdentityBadge type={isSenderAgent ? 'agent' : 'human'} />
            {senderStreak && senderStreak.currentStreak > 0 && (
              <StreakBadge
                streak={senderStreak.currentStreak}
                isActive={senderStreak.isActiveToday}
                size="sm"
              />
            )}
            <span className="text-xs text-black/50">gave</span>
            <Link href={`/agent/2741/${kudos.agentId}`} className="shrink-0">
              <AgentAvatar name={name} imageUrl={agent?.image_url} size={32} />
            </Link>
            <Link
              href={`/agent/2741/${kudos.agentId}`}
              className="text-xs font-semibold text-black hover:text-black transition-colors"
            >
              {name}
            </Link>
            <span className="text-xs text-black/50">kudos</span>
            {isValidCategory && (
              <>
                <span className="text-xs text-black/50">for</span>
                <CategoryBadge category={kudos.tag2 as KudosCategory} />
              </>
            )}
          </div>
          <a
            href={`https://abscan.org/tx/${kudos.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-black/50/50 hover:text-black transition-colors shrink-0 mt-0.5"
            title="View transaction on Abscan"
          >
            {timestamp ? formatRelativeTime(timestamp) : 'tx'} ↗
          </a>
        </div>

        {kudos.message && (
          <p className="text-xs text-black/50/70 mt-1 line-clamp-2 leading-relaxed">
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
  // Build sender lookup: lowercase address → ScanAgent
  const senderMap = new Map<string, ScanAgent>();
  if (agents) {
    for (const agent of agents) {
      agentMap.set(Number(agent.token_id), agent);
      if (agent.owner_address)
        senderMap.set(agent.owner_address.toLowerCase(), agent);
      if (agent.agent_wallet)
        senderMap.set(agent.agent_wallet.toLowerCase(), agent);
    }
  }

  const recent = kudos?.slice(0, 5);
  const senders = recent?.map((k) => k.sender) || [];
  const { data: agentSet } = useIsAgent(senders);
  const blockNumbers = recent?.map((k) => k.blockNumber) || [];
  const { data: timestamps } = useBlockTimestamps(blockNumbers);

  // Fetch streaks for all recent senders
  const senderAddresses = [
    ...new Set(recent?.map((k) => k.sender.toLowerCase()) || []),
  ];
  const { data: streaksData } = useStreaksBulk(senderAddresses);

  return (
    <div className="rounded-none border border-black/20 overflow-hidden bg-white/50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/20">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-none bg-[#00DE73] opacity-75" />
            <span className="relative inline-flex rounded-none h-2 w-2 bg-[#00DE73]" />
          </span>
          <h2 className="text-sm font-bold uppercase tracking-wider">
            Latest Kudos
          </h2>
        </div>
        <Link
          href="/kudos"
          className="text-xs text-black/50 hover:text-black transition-colors"
        >
          View all →
        </Link>
      </div>

      {/* Feed list */}
      <div>
        {isLoading ? (
          <div className="space-y-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex gap-3 px-4 py-3 border-b border-black/20/50"
              >
                <div className="w-8 h-8 rounded-none bg-black/5/40 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-black/5/40 rounded w-2/3 animate-pulse" />
                  <div className="h-3 bg-black/5/40 rounded w-1/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : !recent?.length ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-black/50">
              No kudos yet - be the first!
            </p>
          </div>
        ) : (
          recent.map((k, i) => (
            <FeedItem
              key={`${k.txHash}-${i}`}
              kudos={k}
              agent={agentMap.get(k.agentId)}
              senderAgent={senderMap.get(k.sender.toLowerCase())}
              timestamp={timestamps?.get(k.blockNumber.toString())}
              isSenderAgent={
                agentSet?.has(k.sender.toLowerCase()) ??
                !!senderMap.get(k.sender.toLowerCase())
              }
              senderStreak={streaksData?.[k.sender.toLowerCase()]}
            />
          ))
        )}
      </div>
    </div>
  );
}
