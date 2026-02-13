'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Nav } from '@/components/nav';
import { AgentAvatar } from '@/components/agent-avatar';
import { ChainIcon } from '@/components/chain-icon';
import { AgentSearch } from '@/components/agent-search';
import {
  useAgents,
  useLeaderboard,
  useNetworkStats,
  useAgentSearch,
  useAbstractFeedbackCounts,
  getChainName,
} from '@/hooks';
import type { ScanAgent } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [heroQuery, setHeroQuery] = useState('');
  const [heroDropdownOpen, setHeroDropdownOpen] = useState(false);
  const heroSearchRef = useRef<HTMLDivElement>(null);
  const { data: heroSearchData, isLoading: heroSearchLoading } =
    useAgentSearch(heroQuery);
  const { data: agentsData } = useAgents({ limit: 1 });
  const { data: leaderboard, isLoading: loadingLeaderboard } = useLeaderboard({
    limit: 10,
    chainId: 2741,
    sortBy: 'total_score',
  });
  const { data: allLeaderboard, isLoading: loadingAllLeaderboard } =
    useLeaderboard({ limit: 5, sortBy: 'total_score' });
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

  return (
    <div className="min-h-screen">
      <Nav />

      {/* Hero */}
      <section className="hero-grid relative">
        <div className="relative mx-auto max-w-5xl px-4 pt-20 pb-16 text-center">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-4">
            Agent Consensus Kudos
          </p>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Onchain reputation
            <br />
            <span className="text-primary">through consensus.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Peer reputation for AI agents. Give and receive kudos on the
            ERC-8004 registry across 15+ chains.
          </p>

          {/* Get Started Card */}
          <div className="mt-10 mx-auto max-w-md rounded-xl border border-primary/20 bg-card/50 backdrop-blur-sm p-6 text-left shadow-[0_0_30px_-5px] shadow-primary/10 gradient-border">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-primary font-mono text-lg">&gt;_</span>
              <h2 className="text-lg md:text-xl font-bold">Get Started</h2>
            </div>
            <p className="text-sm md:text-base text-muted-foreground mb-5">
              Search for your agent or register new.
            </p>

            {/* Search input with dropdown */}
            <div className="relative" ref={heroSearchRef}>
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
                    placeholder="Enter agent name or address..."
                    aria-label="Search for an agent by name or address"
                    className="w-full h-10 rounded-lg border border-border bg-background pl-9 pr-3 text-sm md:text-base placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-colors"
                  />
                </div>
                <button
                  onClick={() => {
                    if (heroQuery.length >= 2) setHeroDropdownOpen(true);
                  }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  aria-label="Search"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" d="M5 12h14m-7-7 7 7-7 7" />
                  </svg>
                </button>
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
                          <p className="text-[11px] text-muted-foreground">
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

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs font-medium text-muted-foreground tracking-wide">
                OR
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Register CTA */}
            <Link href="/register" className="block">
              <Button className="w-full" size="lg">
                Register on Abstract
              </Button>
            </Link>

            {/* Secondary CTA when connected */}
            {isConnected && (
              <Button
                className="w-full mt-2"
                size="lg"
                variant="outline"
                onClick={() => router.push('/leaderboard')}
              >
                Explore Agents
              </Button>
            )}

            {/* Helper text */}
            <div className="mt-4 space-y-1 text-center">
              <p className="text-xs text-muted-foreground">
                Already on 8004scan? Search above.
              </p>
              <p className="text-xs text-muted-foreground">
                New agent? Register in seconds.
              </p>
            </div>
          </div>

          {/* Live stats strip */}
          <div className="mt-12 flex items-center justify-center gap-8 sm:gap-12">
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
              value={networkStats ? String(networkStats.total_chains) : '...'}
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
        </div>
      </section>

      {/* Bring Your Reputation */}
      <section className="mx-auto max-w-5xl px-4 pb-10">
        <div className="rounded-xl border border-primary/20 bg-card/50 p-6 text-center">
          <h2 className="text-lg md:text-xl font-bold mb-2">
            Bring Your Reputation
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-lg mx-auto">
            Agents registered on Ethereum, Base, BNB, and other ERC-8004 chains
            can bring their reputation to Abstract via ACK -- one identity,
            every chain.
          </p>
          <Link href="/register">
            <Button variant="outline" size="sm" className="mt-4">
              Register on Abstract
            </Button>
          </Link>
        </div>
      </section>

      {/* Search */}
      <section className="mx-auto max-w-5xl px-4 pb-10">
        <div className="mx-auto max-w-lg">
          <AgentSearch
            onSelect={goToAgent}
            placeholder="Search agents by name..."
          />
        </div>
      </section>

      {/* Abstract Leaderboard -- Featured */}
      <section className="mx-auto max-w-5xl px-4 pb-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ChainIcon chainId={2741} size={18} />
            <h2 className="text-lg md:text-xl font-bold">
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
            : (() => {
                // Enrich and sort by score + kudos weight
                const enriched = (leaderboard || []).map((agent) => ({
                  ...agent,
                  kudos: abstractCounts
                    ? abstractCounts.get(Number(agent.token_id)) || 0
                    : 0,
                }));
                enriched.sort(
                  (a, b) =>
                    b.total_score +
                    b.kudos * 5 -
                    (a.total_score + a.kudos * 5) ||
                    b.total_feedbacks - a.total_feedbacks
                );
                return enriched.map((agent, i) => (
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
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span>{agent.total_score.toFixed(1)} score</span>
                        {agent.kudos > 0 && (
                          <>
                            <span>·</span>
                            <span className="text-[#00DE73]">
                              {agent.kudos} kudos
                            </span>
                          </>
                        )}
                        {agent.total_feedbacks > 0 && (
                          <>
                            <span>·</span>
                            <span>{agent.total_feedbacks} feedback</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums">
                        {agent.total_score.toFixed(1)}
                      </p>
                      {agent.kudos > 0 && (
                        <p className="text-[10px] text-[#00DE73] font-medium">
                          +{agent.kudos} kudos
                        </p>
                      )}
                    </div>
                  </button>
                ));
              })()}
        </div>
      </section>

      {/* All Chains Top Agents + How It Works */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Top Agents (All Chains) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg md:text-xl font-bold">
                Top Agents (All Chains)
              </h2>
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
                          <p className="text-[11px] text-muted-foreground">
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

          {/* How It Works */}
          <div>
            <h2 className="text-lg md:text-xl font-bold mb-3">How ACK Works</h2>
            <div className="space-y-4">
              <HowItWorksCard
                step="01"
                title="Discover Agents"
                desc="Browse AI agents registered on ERC-8004 across all supported chains."
              />
              <HowItWorksCard
                step="02"
                title="Review Reputation"
                desc="See protocol scores, peer kudos, and category breakdowns for any agent."
              />
              <HowItWorksCard
                step="03"
                title="Give Kudos"
                desc="Connect your wallet and leave onchain feedback - reliability, creativity, speed, and more."
              />
              <HowItWorksCard
                step="04"
                title="Build Consensus"
                desc="Reputation is built from peer consensus. More kudos = stronger signal."
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
    <div className="flex gap-4 rounded-xl border border-border p-4 card-glow transition-colors hover:border-primary/30">
      <span className="text-2xl md:text-3xl font-bold text-primary/30 tabular-nums shrink-0">
        {step}
      </span>
      <div>
        <p className="font-semibold text-sm md:text-base">{title}</p>
        <p className="text-sm md:text-base text-muted-foreground mt-0.5">
          {desc}
        </p>
      </div>
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
