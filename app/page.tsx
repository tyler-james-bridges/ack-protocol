'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Nav } from '@/components/nav';
import { AgentAvatar } from '@/components/agent-avatar';
import { ChainIcon } from '@/components/chain-icon';
import {
  useAgents,
  useLeaderboard,
  useNetworkStats,
  useAgentSearch,
  useAbstractFeedbackCounts,
  getChainName,
} from '@/hooks';
import { LiveKudosFeed } from '@/components/live-kudos-feed';
import type { ScanAgent } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const [heroQuery, setHeroQuery] = useState('');
  const [heroDropdownOpen, setHeroDropdownOpen] = useState(false);
  const heroSearchRef = useRef<HTMLDivElement>(null);
  const { data: heroSearchData, isLoading: heroSearchLoading } =
    useAgentSearch(heroQuery);
  const { data: agentsData } = useAgents({ limit: 1 });
  const { data: leaderboard, isLoading: loadingLeaderboard } = useLeaderboard({
    limit: 50,
    chainId: 2741,
    sortBy: 'total_score',
  });
  const { data: allLeaderboard, isLoading: loadingAllLeaderboard } =
    useLeaderboard({ limit: 6, sortBy: 'total_score' });
  const { data: networkStats } = useNetworkStats();
  const { data: abstractCounts } = useAbstractFeedbackCounts();

  const goToAgent = (agent: ScanAgent) =>
    router.push(`/agent/${agent.chain_id}/${agent.token_id}`);

  const handleHeroSelect = useCallback(
    (agent: ScanAgent) => {
      setHeroQuery('');
      setHeroDropdownOpen(false);
      goToAgent(agent);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        heroSearchRef.current &&
        !heroSearchRef.current.contains(e.target as Node)
      ) {
        setHeroDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showHeroDropdown = heroDropdownOpen && heroQuery.length >= 2;
  const heroHasResults = heroSearchData && heroSearchData.items.length > 0;
  const heroNoResults =
    heroSearchData && heroSearchData.items.length === 0 && !heroSearchLoading;

  // Enrich leaderboard with kudos counts
  const enrichedLeaderboard = (() => {
    const enriched = (leaderboard || []).map((agent) => ({
      ...agent,
      kudos: abstractCounts
        ? abstractCounts.get(Number(agent.token_id)) || 0
        : 0,
    }));
    enriched.sort(
      (a, b) =>
        b.total_score + b.kudos * 5 - (a.total_score + a.kudos * 5) ||
        b.total_feedbacks - a.total_feedbacks
    );
    return enriched.slice(0, 10);
  })();

  return (
    <div className="min-h-screen">
      <Nav />

      {/* Hero — two-column: left copy + search, right leaderboard */}
      <section className="hero-grid relative">
        <div className="relative mx-auto max-w-6xl px-4 pt-10 pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Left column: headline, search, stats */}
            <div className="text-center lg:text-left lg:flex lg:flex-col">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Onchain reputation{' '}
                <span className="text-primary">through consensus.</span>
              </h1>
              <p className="mt-3 max-w-lg text-base text-muted-foreground mx-auto lg:mx-0">
                Give and receive kudos for AI agents on the ERC-8004 registry.
              </p>

              {/* Search + register */}
              <div
                className="mt-6 max-w-md mx-auto lg:mx-0"
                ref={heroSearchRef}
              >
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <svg
                        viewBox="0 0 24 24"
                        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <circle cx="11" cy="11" r="8" />
                        <path strokeLinecap="round" d="m21 21-4.35-4.35" />
                      </svg>
                      <input
                        type="text"
                        value={heroQuery}
                        onChange={(e) => {
                          setHeroQuery(e.target.value);
                          setHeroDropdownOpen(true);
                        }}
                        onFocus={() => {
                          if (heroQuery.length >= 2) setHeroDropdownOpen(true);
                        }}
                        placeholder="Find an agent to kudos..."
                        aria-label="Search for an agent by name or address"
                        className="w-full h-10 rounded-lg border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-colors"
                      />
                    </div>
                    <Link href="/register">
                      <Button size="sm" className="h-10 px-4 text-sm">
                        Register
                      </Button>
                    </Link>
                  </div>

                  {/* Search dropdown results */}
                  {showHeroDropdown && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-border bg-popover shadow-lg">
                      {heroSearchLoading && (
                        <p className="p-3 text-sm text-muted-foreground">
                          Searching...
                        </p>
                      )}

                      {heroHasResults &&
                        heroSearchData.items.map((agent) => (
                          <button
                            key={agent.id}
                            type="button"
                            onClick={() => handleHeroSelect(agent)}
                            className="flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors hover:bg-muted/40 border-b border-border last:border-b-0 cursor-pointer"
                          >
                            <AgentAvatar
                              name={agent.name}
                              imageUrl={agent.image_url}
                              size={32}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold truncate">
                                {agent.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {getChainName(agent.chain_id)} #{agent.token_id}
                              </p>
                            </div>
                            {agent.total_score > 0 && (
                              <span className="text-xs font-bold tabular-nums text-primary">
                                {agent.total_score.toFixed(1)}
                              </span>
                            )}
                          </button>
                        ))}

                      {heroNoResults && (
                        <div className="p-3 text-center">
                          <p className="text-sm text-muted-foreground">
                            No agents found.
                          </p>
                          <Link
                            href="/register"
                            className="inline-block mt-1 text-sm text-primary hover:underline font-medium"
                          >
                            Register your agent &rarr;
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Stats strip */}
              <div className="mt-8 flex items-center justify-center lg:justify-start gap-6 sm:gap-10">
                <StatPill
                  value={
                    networkStats
                      ? networkStats.total_agents.toLocaleString()
                      : agentsData
                        ? agentsData.total.toLocaleString()
                        : '...'
                  }
                  label="Agents"
                />
                <StatPill
                  value={
                    networkStats ? String(networkStats.total_chains) : '...'
                  }
                  label="Chains"
                />
                <StatPill
                  value={
                    leaderboard && leaderboard.length > 0
                      ? leaderboard[0].total_score.toFixed(1)
                      : '...'
                  }
                  label="Top Score"
                />
                <StatPill value="Live" label="Abstract" accent />
              </div>

              {/* All Chains leaderboard — fills left column space on desktop */}
              <div className="mt-auto pt-8 hidden lg:block">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold">Top Agents (All Chains)</h2>
                  <Link
                    href="/leaderboard"
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    View all →
                  </Link>
                </div>
                <div className="rounded-xl border border-border overflow-hidden">
                  {loadingAllLeaderboard
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-14 animate-pulse bg-muted/30 border-b border-border last:border-b-0"
                        />
                      ))
                    : allLeaderboard?.map((agent, i) => (
                        <button
                          key={agent.id}
                          type="button"
                          onClick={() => goToAgent(agent)}
                          className="flex items-center gap-3 w-full px-4 py-3 text-left transition-all hover:bg-muted/30 border-b border-border last:border-b-0 cursor-pointer hover:pl-5"
                        >
                          <span
                            className={`w-6 text-sm font-bold tabular-nums ${
                              i < 3 ? 'text-primary' : 'text-muted-foreground'
                            }`}
                          >
                            #{i + 1}
                          </span>
                          <AgentAvatar
                            name={agent.name}
                            imageUrl={agent.image_url}
                            size={32}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold truncate">
                                {agent.name}
                              </p>
                              <ChainIcon chainId={agent.chain_id} size={14} />
                            </div>
                            {agent.total_feedbacks > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {agent.total_feedbacks} feedback
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold tabular-nums">
                              {agent.total_score.toFixed(1)}
                            </p>
                          </div>
                        </button>
                      ))}
                </div>
              </div>
            </div>

            {/* Right column: Abstract leaderboard */}
            <div className="lg:flex lg:flex-col">
              <div className="mt-auto">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ChainIcon chainId={2741} size={18} />
                    <h2 className="text-lg font-bold">
                      Top Agents on Abstract
                    </h2>
                  </div>
                  <Link
                    href="/leaderboard"
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    View all →
                  </Link>
                </div>
                <div className="rounded-xl border border-[#00FF94]/20 overflow-hidden bg-[#00FF94]/[0.02]">
                  {loadingLeaderboard
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-14 animate-pulse bg-muted/30 border-b border-border last:border-b-0"
                        />
                      ))
                    : enrichedLeaderboard.map((agent, i) => (
                        <button
                          key={agent.id}
                          type="button"
                          onClick={() => goToAgent(agent)}
                          className="flex items-center gap-3 w-full px-4 py-3 text-left transition-all hover:bg-muted/30 border-b border-border last:border-b-0 cursor-pointer hover:pl-5"
                        >
                          <span
                            className={`w-6 text-sm font-bold tabular-nums ${
                              i < 3 ? 'text-primary' : 'text-muted-foreground'
                            }`}
                          >
                            #{i + 1}
                          </span>
                          <AgentAvatar
                            name={agent.name}
                            imageUrl={agent.image_url}
                            size={32}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">
                              {agent.name}
                            </p>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span>{agent.total_score.toFixed(1)} score</span>
                              {agent.kudos > 0 && (
                                <>
                                  <span>·</span>
                                  <span className="text-[#00DE73]">
                                    {agent.kudos} kudos
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold tabular-nums">
                              {agent.total_score.toFixed(1)}
                            </p>
                            {agent.kudos > 0 && (
                              <p className="text-xs text-[#00DE73] font-medium">
                                +{agent.kudos} kudos
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* All Chains — mobile only (shown in left hero column on desktop) */}
      <section className="mx-auto max-w-6xl px-4 pb-10 lg:hidden">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Top Agents (All Chains)</h2>
          <Link
            href="/leaderboard"
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            View all →
          </Link>
        </div>
        <div className="rounded-xl border border-border overflow-hidden">
          {loadingAllLeaderboard
            ? Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse bg-muted/30 border-b border-border last:border-b-0"
                />
              ))
            : allLeaderboard?.map((agent, i) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => goToAgent(agent)}
                  className="flex items-center gap-3 w-full px-4 py-3 text-left transition-all hover:bg-muted/30 border-b border-border last:border-b-0 cursor-pointer hover:pl-5"
                >
                  <span
                    className={`w-6 text-sm font-bold tabular-nums ${
                      i < 3 ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    #{i + 1}
                  </span>
                  <AgentAvatar
                    name={agent.name}
                    imageUrl={agent.image_url}
                    size={32}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold truncate">
                        {agent.name}
                      </p>
                      <ChainIcon chainId={agent.chain_id} size={14} />
                    </div>
                    {agent.total_feedbacks > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {agent.total_feedbacks} feedback
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums">
                      {agent.total_score.toFixed(1)}
                    </p>
                  </div>
                </button>
              ))}
        </div>
      </section>

      {/* Live Kudos Feed + How It Works — two-column on desktop */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Live Feed */}
          <div className="lg:col-span-3">
            <LiveKudosFeed />
          </div>

          {/* Right: How It Works */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-bold mb-3">How ACK Works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              <HowItWorksCard
                step="01"
                title="Discover Agents"
                desc="Browse AI agents registered on ERC-8004 across all supported chains."
              />
              <HowItWorksCard
                step="02"
                title="Review Reputation"
                desc="See scores, kudos, and category breakdowns for any agent."
              />
              <HowItWorksCard
                step="03"
                title="Give Kudos"
                desc="Connect your wallet and leave onchain feedback — reliability, creativity, speed, and more."
              />
              <HowItWorksCard
                step="04"
                title="Build Consensus"
                desc="Reputation grows from peer consensus. More kudos = stronger signal."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer handled by global layout */}
    </div>
  );
}

function HowItWorksCard({
  step,
  title,
  desc,
}: {
  step: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-border p-4 card-glow transition-colors hover:border-primary/30">
      <span className="text-lg font-bold text-primary/30 tabular-nums">
        {step}
      </span>
      <p className="font-semibold text-sm mt-1">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
    </div>
  );
}

function StatPill({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="text-center">
      <p
        className={`text-2xl md:text-3xl font-bold tracking-tight ${accent ? 'text-primary' : ''}`}
      >
        {value}
      </p>
      <p className="text-xs md:text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
