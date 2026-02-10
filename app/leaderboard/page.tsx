'use client';

import { useState } from 'react';
import { useLeaderboard, useAgents, getChainName } from '@/hooks';
import { AgentAvatar } from '@/components/agent-avatar';
import { ChainIcon } from '@/components/chain-icon';
import { Nav } from '@/components/nav';
import { useRouter } from 'next/navigation';
import type { ScanAgent } from '@/lib/api';

const CHAIN_FILTERS = [
  { label: 'All Chains', value: 0 },
  { label: 'Abstract', value: 2741 },
  { label: 'Base', value: 8453 },
  { label: 'Ethereum', value: 1 },
  { label: 'Arbitrum', value: 42161 },
];

type SortKey = 'total_score' | 'total_feedbacks' | 'star_count';

const SORT_OPTIONS: { label: string; value: SortKey }[] = [
  { label: 'Score', value: 'total_score' },
  { label: 'Feedback', value: 'total_feedbacks' },
  { label: 'Stars', value: 'star_count' },
];

export default function LeaderboardPage() {
  const router = useRouter();
  const [chainFilter, setChainFilter] = useState(0);
  const [sortBy, setSortBy] = useState<SortKey>('total_score');
  const { data: agents, isLoading } = useLeaderboard({ limit: 50, sortBy });
  const { data: allAgents } = useAgents({ limit: 1 });

  const filtered = (agents || []).filter(
    (a) => chainFilter === 0 || a.chain_id === chainFilter
  );

  const totalAgents = allAgents?.total || 0;
  const totalFeedback = filtered.reduce((sum, a) => sum + a.total_feedbacks, 0);
  const avgScore =
    filtered.length > 0
      ? filtered.reduce((sum, a) => sum + a.total_score, 0) / filtered.length
      : 0;

  const goToAgent = (agent: ScanAgent) =>
    router.push(`/agent/${agent.chain_id}/${agent.token_id}`);

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <div className="mx-auto max-w-5xl px-4 pt-8 pb-16">
        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-1">
            Rankings
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Agent Leaderboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Top-performing agents ranked by score across ERC-8004 chains.
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
          <StatCard label="Total Agents" value={totalAgents.toLocaleString()} />
          <StatCard label="Avg Protocol Score" value={avgScore.toFixed(1)} sub="via 8004scan" />
          <StatCard label="Total Kudos" value={totalFeedback.toLocaleString()} sub="peer feedback" accent />
          <StatCard label="Chains" value="15+" />
        </div>

        {/* Filters & Sort */}
        <div className="space-y-3 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            {CHAIN_FILTERS.map((cf) => (
              <button
                key={cf.value}
                onClick={() => setChainFilter(cf.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors border ${
                  chainFilter === cf.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
                }`}
              >
                {cf.label}
              </button>
            ))}
          </div>
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

        {/* Leaderboard List */}
        <div className="rounded-xl border border-border overflow-hidden">
          {isLoading ? (
            <div className="space-y-0">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse bg-muted/30 border-b border-border last:border-b-0"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-12 text-center text-muted-foreground">
              No agents found for this chain.
            </div>
          ) : (
            filtered.map((agent, i) => (
              <button
                key={agent.id}
                type="button"
                onClick={() => goToAgent(agent)}
                className="flex items-center gap-4 w-full px-4 py-3 text-left transition-colors hover:bg-muted/30 border-b border-border last:border-b-0 cursor-pointer"
              >
                {/* Rank */}
                <span
                  className={`w-8 text-sm font-bold tabular-nums ${
                    i < 3 ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  #{i + 1}
                </span>

                {/* Avatar + Name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <AgentAvatar
                    name={agent.name}
                    imageUrl={agent.image_url}
                    size={36}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {agent.name}
                    </p>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <ChainIcon chainId={agent.chain_id} size={12} />
                      <span>{getChainName(agent.chain_id)}</span>
                      {agent.total_feedbacks > 0 && (
                        <span>· {agent.total_feedbacks} feedback</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dual metrics */}
                <div className="flex items-center gap-4 shrink-0">
                  {/* Protocol Score (8004scan) */}
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums">
                      {agent.total_score.toFixed(1)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">protocol</p>
                  </div>
                  {/* Kudos Score (ours) */}
                  <div className="text-right w-14">
                    {agent.total_feedbacks > 0 ? (
                      <>
                        <p className="text-sm font-bold tabular-nums text-primary">
                          {agent.total_feedbacks}
                        </p>
                        <p className="text-[10px] text-primary/60">kudos</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground/40">—</p>
                        <p className="text-[10px] text-muted-foreground/40">kudos</p>
                      </>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
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
    <div className="rounded-lg border border-border p-4">
      <p className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
        {label}
      </p>
      <p className={`text-2xl font-bold tracking-tight mt-1 ${accent ? 'text-primary' : ''}`}>
        {value}
      </p>
      {sub && (
        <p className="text-[10px] text-muted-foreground/50 mt-0.5">{sub}</p>
      )}
    </div>
  );
}
