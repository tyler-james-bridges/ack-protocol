'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import {
  useLeaderboard,
  useAgents,
  useNetworkStats,
  useAbstractFeedbackCounts,
  getChainName,
} from '@/hooks';
import { AgentAvatar } from '@/components/agent-avatar';
import { ChainIcon } from '@/components/chain-icon';
import { Nav } from '@/components/nav';
import { useRouter, useSearchParams } from 'next/navigation';
import { SUPPORTED_CHAINS } from '@/config/chains';
import type { ScanAgent } from '@/lib/api';

const CHAIN_SLUG_TO_ID: Record<string, number> = {
  abstract: 2741,
  base: 8453,
  bnb: 56,
  ethereum: 1,
  celo: 42220,
  gnosis: 100,
};
const CHAIN_ID_TO_SLUG: Record<number, string> = Object.fromEntries(
  Object.entries(CHAIN_SLUG_TO_ID).map(([k, v]) => [v, k])
);

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

// Non-Abstract chain IDs we support
const OTHER_CHAIN_IDS = SUPPORTED_CHAINS.filter((c) => c.chain.id !== 2741).map(
  (c) => c.chain.id
);

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

  const sortBy = (searchParams.get('sort') as SortKey) || 'created_at';

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
    updateParams({ sort: sort === 'created_at' ? null : sort });

  // Fetch global agents + Abstract agents separately (Abstract may not rank in global top 500)
  const { data: allAgentsList, isLoading } = useLeaderboard({
    limit: 100,
    sortBy,
  });
  const { data: abstractAgentsList, isLoading: isLoadingAbstract } =
    useLeaderboard({ chainId: 2741, limit: 100, sortBy });
  const { data: networkStats } = useNetworkStats();
  const { data: abstractCounts } = useAbstractFeedbackCounts();

  // Expanded chains state (Abstract always expanded by default)
  const [expandedChains, setExpandedChains] = useState<Set<number>>(
    new Set([2741])
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
        agent.chain_id === 2741 && abstractCounts
          ? abstractCounts.get(Number(agent.token_id)) || 0
          : 0,
    }));

  const enrichedAll = enrich(allAgentsList || []);
  const enrichedAbstract = enrich(abstractAgentsList || []);

  // Sort helper
  const doSort = (list: EnrichedAgent[]): EnrichedAgent[] => {
    const s = [...list];
    if (sortBy === 'kudos') {
      s.sort(
        (a, b) =>
          b.kudos - a.kudos ||
          b.total_score - a.total_score ||
          b.total_feedbacks - a.total_feedbacks
      );
    } else if (sortBy === 'total_feedbacks') {
      s.sort(
        (a, b) =>
          b.total_feedbacks - a.total_feedbacks || b.total_score - a.total_score
      );
    }
    return s;
  };

  const sorted = doSort(enrichedAll);
  const abstractAgents = doSort(enrichedAbstract);
  const otherChainAgents = new Map<number, EnrichedAgent[]>();
  for (const agent of sorted) {
    if (agent.chain_id === 2741) continue;
    const list = otherChainAgents.get(agent.chain_id) || [];
    list.push(agent);
    otherChainAgents.set(agent.chain_id, list);
  }

  // Sort other chains by agent count (descending)
  const otherChainEntries = [...otherChainAgents.entries()].sort(
    (a, b) => b[1].length - a[1].length
  );

  const goToAgent = (agent: ScanAgent) =>
    router.push(`/agent/${agent.chain_id}/${agent.token_id}`);

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <div className="mx-auto max-w-5xl px-4 pt-8 pb-16">
        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-1">
            Explore
          </p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Explore Agents
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Discover and explore agents across ERC-8004 chains.
          </p>
        </div>

        {/* Network-wide Stats */}
        {networkStats && (
          <div className="mb-6">
            <p className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase mb-2">
              ERC-8004 Network
            </p>
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                label="Agents (all chains)"
                value={networkStats.total_agents.toLocaleString()}
              />
              <StatCard
                label="Total Feedback"
                value={networkStats.total_feedbacks.toLocaleString()}
                sub="network-wide"
              />
              <StatCard
                label="Chains"
                value={networkStats.total_chains.toLocaleString()}
              />
            </div>
          </div>
        )}

        {/* Sort */}
        <div className="mb-6">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
              Sort by
            </span>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  sortBy === opt.value
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
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
            onClick={() => toggleChain(2741)}
            className="flex items-center gap-3 w-full mb-3 text-left cursor-pointer group"
          >
            <ChainIcon chainId={2741} size={20} />
            <h2 className="text-lg font-bold" style={{ color: '#00FF94' }}>
              Abstract
            </h2>
            <span className="text-xs text-muted-foreground">
              {abstractAgents.length} agents
            </span>
            {abstractAgents.reduce((s, a) => s + a.kudos, 0) > 0 && (
              <span className="text-xs text-[#00DE73] font-medium">
                {abstractAgents.reduce((s, a) => s + a.kudos, 0)} kudos
              </span>
            )}
            <span className="ml-auto text-muted-foreground text-xs group-hover:text-foreground transition-colors">
              {expandedChains.has(2741) ? 'Collapse' : 'Expand'}
            </span>
          </button>

          {expandedChains.has(2741) && (
            <div className="rounded-xl border border-[#00FF94]/20 overflow-hidden bg-[#00FF94]/[0.02]">
              {isLoadingAbstract ? (
                <LoadingSkeleton count={5} />
              ) : abstractAgents.length === 0 ? (
                <EmptyState />
              ) : (
                abstractAgents.map((agent, i) => (
                  <AgentRow
                    key={agent.id}
                    agent={agent}
                    rank={i + 1}
                    sortBy={sortBy}
                    onClick={() => goToAgent(agent)}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Other Chains */}
        {otherChainEntries.length > 0 && (
          <div>
            <p className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase mb-4">
              Other Chains
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {otherChainEntries.map(([chainId, agents]) => {
                const chainMeta = SUPPORTED_CHAINS.find(
                  (c) => c.chain.id === chainId
                );
                const isExpanded = expandedChains.has(chainId);
                const preview = agents.slice(0, 3);

                return (
                  <div
                    key={chainId}
                    className="rounded-xl border border-border overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleChain(chainId)}
                      className="flex items-center gap-2 w-full px-4 py-3 text-left cursor-pointer hover:bg-muted/30 transition-colors"
                    >
                      <ChainIcon chainId={chainId} size={16} />
                      <span className="text-sm font-semibold">
                        {getChainName(chainId)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {agents.length} agents
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {isExpanded ? 'Collapse' : 'Expand'}
                      </span>
                    </button>

                    {!isExpanded && (
                      <div className="px-4 pb-3 space-y-1">
                        {preview.map((agent, i) => (
                          <button
                            key={agent.id}
                            type="button"
                            onClick={() => goToAgent(agent)}
                            className="flex items-center gap-2 w-full text-left py-1 hover:text-primary transition-colors cursor-pointer"
                          >
                            <span className="text-xs text-muted-foreground w-5">
                              #{i + 1}
                            </span>
                            <AgentAvatar
                              name={agent.name}
                              imageUrl={agent.image_url}
                              size={20}
                            />
                            <span className="text-xs font-medium truncate flex-1">
                              {agent.name}
                            </span>
                            <span className="text-xs tabular-nums text-muted-foreground">
                              {agent.total_score.toFixed(1)}
                            </span>
                          </button>
                        ))}
                        {agents.length > 3 && (
                          <p className="text-[10px] text-muted-foreground pt-1">
                            +{agents.length - 3} more
                          </p>
                        )}
                      </div>
                    )}

                    {isExpanded && (
                      <div>
                        {agents.map((agent, i) => (
                          <AgentRow
                            key={agent.id}
                            agent={agent}
                            rank={i + 1}
                            sortBy={sortBy}
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
  onClick,
}: {
  agent: EnrichedAgent;
  rank: number;
  sortBy: SortKey;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-4 w-full px-4 py-3 text-left transition-colors hover:bg-muted/30 border-b border-border last:border-b-0 cursor-pointer"
    >
      <span
        className={`w-8 text-sm font-bold tabular-nums ${
          rank <= 3 ? 'text-primary' : 'text-muted-foreground'
        }`}
      >
        #{rank}
      </span>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <AgentAvatar name={agent.name} imageUrl={agent.image_url} size={36} />
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{agent.name}</p>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <ChainIcon chainId={agent.chain_id} size={12} />
            <span>{getChainName(agent.chain_id)}</span>
            {agent.kudos > 0 && (
              <span className="text-[#00DE73]">· {agent.kudos} kudos</span>
            )}
            {agent.total_feedbacks > 0 && (
              <span>· {agent.total_feedbacks} feedback</span>
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
      className={`rounded-lg border p-4 ${accent ? 'border-[#00DE73]/20 bg-[#00DE73]/5' : 'border-border'}`}
    >
      <p className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={`text-2xl md:text-3xl font-bold tracking-tight mt-1 ${accent ? 'text-[#00DE73]' : ''}`}
      >
        {value}
      </p>
      {sub && (
        <p className="text-[10px] text-muted-foreground/50 mt-0.5">{sub}</p>
      )}
    </div>
  );
}

function LoadingSkeleton({ count }: { count: number }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse bg-muted/30 border-b border-border last:border-b-0"
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-4 py-12 text-center text-muted-foreground">
      No agents found.
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
          <p className="text-xs tabular-nums text-muted-foreground">
            {secondary.value}
          </p>
          <p className="text-[10px] text-muted-foreground/50">
            {secondary.label}
          </p>
        </div>
      )}
      <div className="text-right w-14">
        <p
          className={`text-sm font-bold tabular-nums ${primary.accent ? 'text-[#00DE73]' : ''}`}
        >
          {primary.value}
        </p>
        <p
          className={`text-[10px] ${primary.accent ? 'text-[#00DE73]/70' : 'text-muted-foreground'}`}
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
        : { value: '-', label: 'kudos' };
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
