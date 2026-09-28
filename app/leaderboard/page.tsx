'use client';

import { Suspense, useCallback, useState } from 'react';
import {
  useLeaderboard,
  useNetworkStats,
  useAbstractFeedbackCounts,
  getChainName,
} from '@/hooks';
import { AgentAvatar } from '@/components/agent-avatar';
import { ChainIcon } from '@/components/chain-icon';
import { Nav } from '@/components/nav';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ScanAgent } from '@/lib/api';
import { StreakBadge } from '@/components/streak-badge';
import { useStreaksBulk } from '@/hooks';
import { DEFAULT_8004_CHAIN_ID, isKudosIndexed } from '@/config/chain';

type SortKey =
  | 'created_at'
  | 'total_score'
  | 'total_feedbacks'
  | 'kudos'
  | 'star_count';

const SORT_OPTIONS: { label: string; value: SortKey }[] = [
  { label: 'Newest', value: 'created_at' },
  { label: 'Score', value: 'total_score' },
  { label: 'Feedback', value: 'total_feedbacks' },
  { label: 'Kudos', value: 'kudos' },
  { label: 'Stars', value: 'star_count' },
];

export default function LeaderboardPageWrapper() {
  return (
    <Suspense>
      <LeaderboardPage />
    </Suspense>
  );
}

function LeaderboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sortBy = (searchParams.get('sort') as SortKey) || 'kudos';

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === '') params.delete(k);
        else params.set(k, v);
      }
      const qs = params.toString();
      router.replace(`/leaderboard${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [searchParams, router]
  );

  const setSortBy = (sort: SortKey) =>
    updateParams({ sort: sort === 'kudos' ? null : sort });

  // Fetch global agents + Abstract agents separately (Abstract may not rank in global top 500)
  const {
    data: allAgentsList,
    isLoading: isLoadingAll,
    isError: isErrorAll,
  } = useLeaderboard({
    limit: 100,
    sortBy,
  });
  const {
    data: featuredAgentsList,
    isLoading: isLoadingFeatured,
    isError: isErrorFeatured,
  } = useLeaderboard({
    chainId: DEFAULT_8004_CHAIN_ID,
    limit: 100,
    sortBy,
  });
  const {
    data: networkStats,
    isError: statsError,
    isLoading: statsLoading,
  } = useNetworkStats(DEFAULT_8004_CHAIN_ID);
  const { data: abstractCounts } = useAbstractFeedbackCounts();

  const [expandedChains, setExpandedChains] = useState<Set<number>>(
    new Set([DEFAULT_8004_CHAIN_ID])
  );

  const toggleChain = (chainId: number) => {
    setExpandedChains((prev) => {
      const next = new Set(prev);
      if (next.has(chainId)) next.delete(chainId);
      else next.add(chainId);
      return next;
    });
  };

  // Enrich with ACK kudos
  type EnrichedAgent = ScanAgent & { kudos: number };
  const enrich = (agents: ScanAgent[]): EnrichedAgent[] =>
    agents.map((agent) => ({
      ...agent,
      kudos:
        isKudosIndexed(agent.chain_id) && abstractCounts
          ? abstractCounts.get(Number(agent.token_id)) || 0
          : 0,
    }));

  const enrichedAll = enrich(allAgentsList || []);
  const enrichedFeatured = enrich(featuredAgentsList || []);

  // Sort helper — always re-sort client-side to factor in kudos
  const doSort = (list: EnrichedAgent[]): EnrichedAgent[] => {
    const s = [...list];
    switch (sortBy) {
      case 'kudos':
        s.sort(
          (a, b) =>
            b.kudos - a.kudos ||
            b.total_score - a.total_score ||
            b.total_feedbacks - a.total_feedbacks
        );
        break;
      case 'total_feedbacks':
        s.sort(
          (a, b) =>
            b.total_feedbacks - a.total_feedbacks ||
            b.total_score - a.total_score
        );
        break;
      case 'total_score':
        s.sort(
          (a, b) => b.total_score + b.kudos * 5 - (a.total_score + a.kudos * 5)
        );
        break;
      case 'star_count':
        s.sort(
          (a, b) => b.star_count - a.star_count || b.total_score - a.total_score
        );
        break;
      default: // created_at
        s.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
    }
    return s;
  };

  const sorted = doSort(enrichedAll);
  const featuredAgents = doSort(enrichedFeatured);
  const otherChainAgents = new Map<number, EnrichedAgent[]>();
  for (const agent of sorted) {
    if (agent.chain_id === DEFAULT_8004_CHAIN_ID) continue;
    const list = otherChainAgents.get(agent.chain_id) || [];
    list.push(agent);
    otherChainAgents.set(agent.chain_id, list);
  }

  // Sort other chains by agent count (descending)
  const otherChainEntries = [...otherChainAgents.entries()].sort(
    (a, b) => b[1].length - a[1].length
  );

  // Collect all owner/wallet addresses for bulk streak lookup
  const allAddresses = [
    ...new Set(
      [...(featuredAgentsList || []), ...(allAgentsList || [])]
        .flatMap((a) => [a.owner_address, a.agent_wallet].filter(Boolean))
        .map((a) => (a as string).toLowerCase())
    ),
  ];
  const { data: streaksData } = useStreaksBulk(allAddresses);

  const getAgentStreak = (agent: ScanAgent) => {
    if (!streaksData) return undefined;
    const ownerStreak = agent.owner_address
      ? streaksData[agent.owner_address.toLowerCase()]
      : undefined;
    const walletStreak = agent.agent_wallet
      ? streaksData[agent.agent_wallet.toLowerCase()]
      : undefined;
    return ownerStreak || walletStreak;
  };

  const goToAgent = (agent: ScanAgent) =>
    router.push(`/agent/${agent.chain_id}/${agent.token_id}`);

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <div className="mx-auto max-w-5xl px-4 pt-4">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }]} current="Explore" />
      </div>

      <div className="mx-auto max-w-5xl px-4 pt-8 pb-16">
        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-widest text-black uppercase mb-1">
            Explore
          </p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Explore Agents
          </h1>
          <p className="text-sm md:text-base text-black/50 mt-1">
            Agents on {getChainName(DEFAULT_8004_CHAIN_ID)}. Other chains are in
            the list.
          </p>
        </div>

        {/* Abstract Stats */}
        {networkStats && !statsError && !statsLoading && (
          <div className="mb-6">
            <p className="text-[10px] font-medium tracking-wider text-black/50 uppercase mb-2">
              {getChainName(DEFAULT_8004_CHAIN_ID)}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatCard
                label={`Agents on ${getChainName(DEFAULT_8004_CHAIN_ID)}`}
                value={networkStats.total_agents.toLocaleString()}
              />
              <StatCard
                label="Total Feedback"
                value={networkStats.total_feedbacks.toLocaleString()}
              />
              {isKudosIndexed(DEFAULT_8004_CHAIN_ID) && (
                <StatCard
                  label="Kudos Given"
                  value={networkStats.total_kudos?.toLocaleString() || '0'}
                />
              )}
            </div>
          </div>
        )}

        {/* Sort */}
        <div className="mb-6">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium tracking-wider text-black/50 uppercase">
              Sort by
            </span>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                  sortBy === opt.value
                    ? 'bg-black text-white'
                    : 'text-black/50 hover:text-black'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Abstract Section -- Featured */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() => toggleChain(DEFAULT_8004_CHAIN_ID)}
            className="flex items-center gap-3 w-full mb-3 text-left cursor-pointer group"
          >
            <ChainIcon chainId={DEFAULT_8004_CHAIN_ID} size={20} />
            <h2 className="text-lg font-bold">
              {getChainName(DEFAULT_8004_CHAIN_ID)}
            </h2>
            <span className="text-xs text-black/50">
              {featuredAgents.length} agents
            </span>
            {featuredAgents.reduce((s, a) => s + a.kudos, 0) > 0 && (
              <span className="text-xs text-black font-medium">
                {featuredAgents.reduce((s, a) => s + a.kudos, 0)} kudos
              </span>
            )}
            <span className="ml-auto text-black/50 text-xs group-hover:text-black transition-colors">
              {expandedChains.has(DEFAULT_8004_CHAIN_ID)
                ? 'Collapse'
                : 'Expand'}
            </span>
          </button>

          {expandedChains.has(DEFAULT_8004_CHAIN_ID) && (
            <div className="border-2 border-black overflow-hidden bg-white">
              {isLoadingFeatured ? (
                <LoadingSkeleton count={5} />
              ) : isErrorFeatured ? (
                <ErrorState />
              ) : featuredAgents.length === 0 ? (
                <EmptyState />
              ) : (
                featuredAgents.map((agent, i) => (
                  <AgentRow
                    key={agent.id}
                    agent={agent}
                    rank={i + 1}
                    sortBy={sortBy}
                    streak={getAgentStreak(agent)}
                    onClick={() => goToAgent(agent)}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Other Chains */}
        {isLoadingAll && !allAgentsList && (
          <div className="mb-8">
            <p className="text-[10px] font-medium tracking-wider text-black/50 uppercase mb-4">
              Other Chains
            </p>
            <LoadingSkeleton count={3} />
          </div>
        )}
        {isErrorAll && !allAgentsList && (
          <div className="mb-8">
            <p className="text-[10px] font-medium tracking-wider text-black/50 uppercase mb-4">
              Other Chains
            </p>
            <div className="border-2 border-black overflow-hidden">
              <ErrorState />
            </div>
          </div>
        )}
        {otherChainEntries.length > 0 && (
          <div>
            <p className="text-[10px] font-medium tracking-wider text-black/50 uppercase mb-4">
              Other Chains
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {otherChainEntries.map(([chainId, agents]) => {
                const isExpanded = expandedChains.has(chainId);

                return (
                  <div
                    key={chainId}
                    className="border-2 border-black overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleChain(chainId)}
                      className="flex items-center gap-2 w-full px-4 py-3 text-left cursor-pointer hover:bg-black/5 transition-colors"
                    >
                      <ChainIcon chainId={chainId} size={16} />
                      <span className="text-sm font-semibold">
                        {getChainName(chainId)}
                      </span>
                      <span className="text-xs text-black/50">
                        {agents.length} agents
                      </span>
                      <span className="ml-auto text-xs text-black/50">
                        {isExpanded ? 'Collapse' : 'Expand'}
                      </span>
                    </button>

                    {isExpanded && (
                      <div>
                        {agents.map((agent, i) => (
                          <AgentRow
                            key={agent.id}
                            agent={agent}
                            rank={i + 1}
                            sortBy={sortBy}
                            streak={getAgentStreak(agent)}
                            onClick={() => goToAgent(agent)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type EnrichedAgent = ScanAgent & { kudos: number };

function AgentRow({
  agent,
  rank,
  sortBy,
  streak,
  onClick,
}: {
  agent: EnrichedAgent;
  rank: number;
  sortBy: SortKey;
  streak?: { currentStreak: number; isActiveToday: boolean };
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-4 w-full px-4 py-3 text-left transition-colors hover:bg-black/5 border-b border-black/10 last:border-b-0 cursor-pointer"
    >
      <span
        className={`w-8 text-sm font-bold tabular-nums ${
          rank <= 3 ? 'text-black' : 'text-black/50'
        }`}
      >
        #{rank}
      </span>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <AgentAvatar name={agent.name} imageUrl={agent.image_url} size={36} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold truncate">{agent.name}</p>
            {streak && streak.currentStreak > 0 && (
              <StreakBadge
                streak={streak.currentStreak}
                isActive={streak.isActiveToday}
                size="sm"
              />
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-black/50">
            <ChainIcon chainId={agent.chain_id} size={12} />
            <span>{getChainName(agent.chain_id)}</span>
            {agent.kudos > 0 && (
              <span className="text-black">· {agent.kudos} kudos</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <SortMetric agent={agent} sortBy={sortBy} />
      </div>
    </button>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`border-2 border-black p-4 ${accent ? 'border-black' : 'border-black/10'}`}
    >
      <p className="text-[10px] font-medium tracking-wider text-black/50 uppercase">
        {label}
      </p>
      <p
        className={`text-2xl md:text-3xl font-bold tracking-tight mt-1 ${accent ? 'text-black' : ''}`}
      >
        {value}
      </p>
      {sub && <p className="text-[10px] text-black/50/50 mt-0.5">{sub}</p>}
    </div>
  );
}

function LoadingSkeleton({ count }: { count: number }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse bg-black/5 border-b border-black/10 last:border-b-0"
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-4 py-12 text-center text-black/50">No agents found.</div>
  );
}

function ErrorState() {
  return (
    <div className="px-4 py-12 text-center space-y-2">
      <p className="text-black/50">Failed to load agents. Try refreshing.</p>
      <button
        onClick={() => window.location.reload()}
        className="text-sm text-black hover:underline"
      >
        Refresh
      </button>
    </div>
  );
}

function SortMetric({
  agent,
  sortBy,
}: {
  agent: EnrichedAgent;
  sortBy: SortKey;
}) {
  const primary = getPrimary(agent, sortBy);
  const secondary = getSecondary(agent, sortBy);

  return (
    <>
      {secondary && (
        <div className="text-right w-14 hidden sm:block">
          <p className="text-xs tabular-nums text-black/50">
            {secondary.value}
          </p>
          <p className="text-[10px] text-black/50/50">{secondary.label}</p>
        </div>
      )}
      <div className="text-right w-14">
        <p
          className={`text-sm font-bold tabular-nums ${primary.accent ? 'text-black' : ''}`}
        >
          {primary.value}
        </p>
        <p
          className={`text-[10px] ${primary.accent ? 'text-black/70' : 'text-black/50'}`}
        >
          {primary.label}
        </p>
      </div>
    </>
  );
}

function getPrimary(
  agent: EnrichedAgent,
  sortBy: SortKey
): { value: string; label: string; accent?: boolean } {
  switch (sortBy) {
    case 'kudos':
      if (!isKudosIndexed(agent.chain_id)) {
        return { value: '—', label: 'not indexed' };
      }
      return agent.kudos > 0
        ? { value: String(agent.kudos), label: 'kudos', accent: true }
        : { value: '0', label: 'kudos' };
    case 'total_feedbacks':
      return agent.total_feedbacks > 0
        ? { value: String(agent.total_feedbacks), label: 'feedback' }
        : { value: '-', label: 'feedback' };
    case 'total_score':
      return { value: agent.total_score.toFixed(1), label: 'score' };
    case 'star_count':
      return agent.star_count > 0
        ? { value: String(agent.star_count), label: 'stars' }
        : { value: '-', label: 'stars' };
    default:
      return { value: agent.total_score.toFixed(1), label: 'score' };
  }
}

function getSecondary(
  agent: EnrichedAgent,
  sortBy: SortKey
): { value: string; label: string } | null {
  switch (sortBy) {
    case 'kudos':
      return { value: agent.total_score.toFixed(1), label: 'score' };
    case 'total_feedbacks':
      return { value: agent.total_score.toFixed(1), label: 'score' };
    case 'total_score':
      return agent.total_feedbacks > 0
        ? { value: String(agent.total_feedbacks), label: 'feedback' }
        : null;
    case 'star_count':
      return { value: agent.total_score.toFixed(1), label: 'score' };
    default:
      return null;
  }
}
