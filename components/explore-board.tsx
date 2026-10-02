'use client';

import { Suspense, useCallback, useState } from 'react';
import {
  useLeaderboard,
  useChainFeedbackCounts,
  getChainName,
  useStreaksBulk,
} from '@/hooks';
import type { ChainFeedbackCounts } from '@/hooks';
import { AgentAvatar } from '@/components/agent-avatar';
import { ChainIcon } from '@/components/chain-icon';
import { Nav } from '@/components/nav';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ScanAgent } from '@/lib/api';
import type { ExploreAgent } from '@/lib/explore-data';
import { resolveBaseAgents } from '@/lib/explore-list';
import { StreakBadge } from '@/components/streak-badge';
import { ABSTRACT_CHAIN_ID, DEFAULT_8004_CHAIN_ID } from '@/config/chain';

const BASE_CHAIN_ID = 8453;

type KudosPaint =
  | { kind: 'loading' }
  | { kind: 'absent' }
  | { kind: 'unindexed' }
  | { kind: 'partial'; count: number }
  | { kind: 'complete'; count: number };

type EnrichedAgent = ScanAgent & { kudos: number };

type CountQuery = {
  isPending: boolean;
  isError: boolean;
  data?: ChainFeedbackCounts;
};

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

export function ExploreBoard({
  initialBaseAgents,
}: {
  initialBaseAgents: ExploreAgent[];
}) {
  return (
    <Suspense>
      <LeaderboardPage initialBaseAgents={initialBaseAgents} />
    </Suspense>
  );
}

function LeaderboardPage({
  initialBaseAgents,
}: {
  initialBaseAgents: ExploreAgent[];
}) {
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
  const { data: allAgentsList, isError: isErrorAll } = useLeaderboard({
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
  const baseCounts = useChainFeedbackCounts(BASE_CHAIN_ID);
  const abstractCounts = useChainFeedbackCounts(ABSTRACT_CHAIN_ID);

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

  const enrich = (agents: ScanAgent[]): EnrichedAgent[] =>
    agents.map((agent) => {
      const kudosPaint = paintForAgent(
        agent.chain_id,
        Number(agent.token_id),
        baseCounts,
        abstractCounts
      );
      return {
        ...agent,
        kudos: resolvedKudos(kudosPaint, agentKudos(agent)),
      };
    });

  const enrichedAll = enrich(allAgentsList || []);
  const baseSource = resolveBaseAgents(initialBaseAgents, featuredAgentsList);
  const enrichedFeatured = enrich(baseSource);
  const kudosGiven = baseKudosTotal(baseCounts);

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
      case 'created_at':
        s.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      default: {
        const unreachable: never = sortBy;
        return unreachable;
      }
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

        {!isLoadingFeatured &&
          !isErrorFeatured &&
          featuredAgents.length > 0 && (
            <div className="mb-6">
              <p className="text-[10px] font-medium tracking-wider text-black/50 uppercase mb-2">
                {getChainName(DEFAULT_8004_CHAIN_ID)}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatCard
                  label={`Agents on ${getChainName(DEFAULT_8004_CHAIN_ID)}`}
                  value={featuredAgents.length.toLocaleString()}
                />
                <StatCard
                  label="Total Feedback"
                  value={featuredAgents
                    .reduce(
                      (sum, agent) => sum + (agent.total_feedbacks || 0),
                      0
                    )
                    .toLocaleString()}
                />
                {kudosGiven !== null && (
                  <StatCard
                    label="Kudos Given"
                    value={kudosGiven.toLocaleString()}
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
            {featuredAgents.length > 0 && (
              <span className="text-sm text-black/70">
                {featuredAgents.length} agents
              </span>
            )}
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

          {expandedChains.has(DEFAULT_8004_CHAIN_ID) &&
            (isLoadingFeatured && featuredAgents.length === 0 ? (
              <p className="text-sm text-black/70">Loading agents...</p>
            ) : isErrorFeatured && featuredAgents.length === 0 ? (
              <ErrorState />
            ) : featuredAgents.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="border-2 border-black overflow-hidden bg-white">
                {featuredAgents.map((agent, i) => (
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
            ))}
        </div>

        {isErrorAll && !allAgentsList && (
          <p className="mb-8 text-sm text-black/70">
            Other chains could not be loaded.
          </p>
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

function EmptyState() {
  return <p className="text-sm text-black/70">No agents on Base yet.</p>;
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

  return (
    <>
      <div className="text-right w-16">
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
      return agent.kudos > 0
        ? { value: String(agent.kudos), label: 'kudos', accent: true }
        : { value: agent.total_score.toFixed(1), label: 'score' };
    case 'total_feedbacks':
      return agent.total_feedbacks > 0
        ? { value: String(agent.total_feedbacks), label: 'feedback' }
        : { value: agent.total_score.toFixed(1), label: 'score' };
    case 'total_score':
      return { value: agent.total_score.toFixed(1), label: 'score' };
    case 'star_count':
      return agent.star_count > 0
        ? { value: String(agent.star_count), label: 'stars' }
        : { value: agent.total_score.toFixed(1), label: 'score' };
    case 'created_at':
      return { value: agent.total_score.toFixed(1), label: 'score' };
    default: {
      const unreachable: never = sortBy;
      return unreachable;
    }
  }
}

function paintForAgent(
  chainId: number,
  tokenId: number,
  base: CountQuery,
  abstract: CountQuery
): KudosPaint {
  if (chainId === BASE_CHAIN_ID) return paintChain(base, tokenId);
  if (chainId === ABSTRACT_CHAIN_ID) return paintChain(abstract, tokenId);
  return { kind: 'unindexed' };
}

function paintChain(query: CountQuery, tokenId: number): KudosPaint {
  if (query.isPending) return { kind: 'loading' };
  if (query.isError || !query.data) return { kind: 'absent' };
  const count = query.data.counts.get(tokenId) ?? 0;
  switch (query.data.coverage.status) {
    case 'absent':
      return { kind: 'absent' };
    case 'partial':
      return { kind: 'partial', count };
    case 'complete':
      return { kind: 'complete', count };
    default: {
      const unreachable: never = query.data.coverage.status;
      return unreachable;
    }
  }
}

function baseKudosTotal(query: CountQuery): number | null {
  if (query.isPending || query.isError || !query.data) return null;
  switch (query.data.coverage.status) {
    case 'partial':
    case 'complete':
      return query.data.total;
    case 'absent':
      return null;
    default: {
      const unreachable: never = query.data.coverage.status;
      return unreachable;
    }
  }
}

function agentKudos(agent: ScanAgent): number {
  if ('kudos' in agent && typeof agent.kudos === 'number') return agent.kudos;
  return 0;
}

function resolvedKudos(paint: KudosPaint, fallback: number): number {
  switch (paint.kind) {
    case 'partial':
    case 'complete':
      return paint.count;
    case 'loading':
    case 'absent':
    case 'unindexed':
      return fallback;
    default: {
      const unreachable: never = paint;
      return unreachable;
    }
  }
}
