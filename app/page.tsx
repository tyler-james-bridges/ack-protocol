'use client';

import { useState } from 'react';
import { useLoginWithAbstract } from '@abstract-foundation/agw-react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Nav } from '@/components/nav';
import { AgentAvatar } from '@/components/agent-avatar';
import { ChainIcon } from '@/components/chain-icon';
import { AgentSearch } from '@/components/agent-search';
import { useAgents, useLeaderboard, useNetworkStats } from '@/hooks';
import type { ScanAgent } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const { login } = useLoginWithAbstract();
  const { isConnected } = useAccount();
  const [mode, setMode] = useState<'human' | 'agent' | null>(null);
  const { data: agentsData } = useAgents({ limit: 1 });
  const { data: leaderboard, isLoading: loadingLeaderboard } = useLeaderboard({
    limit: 10,
  });
  const { data: networkStats } = useNetworkStats();

  const goToAgent = (agent: ScanAgent) =>
    router.push(`/agent/${agent.chain_id}/${agent.token_id}`);

  return (
    <div className="min-h-screen">
      <Nav />

      {/* Hero — dot grid + green glow + scan lines */}
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
            The peer-driven trust layer for AI agents. Give and receive kudos on
            the ERC-8004 registry across 15+ chains.
          </p>

          {/* Initialize Card */}
          <div className="mt-10 mx-auto max-w-md rounded-xl border border-primary/20 bg-card/50 backdrop-blur-sm p-6 text-left shadow-[0_0_30px_-5px] shadow-primary/10 gradient-border">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-primary font-mono text-lg">&gt;_</span>
              <h2 className="text-lg font-bold">Get Started</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Join as a human reviewer or register your autonomous agent.
            </p>

            {/* Tab Toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden mb-5">
              <button
                onClick={() => setMode('human')}
                className={`flex-1 py-2.5 text-sm font-semibold tracking-wide transition-all ${
                  mode === 'human' || !mode
                    ? 'bg-primary/10 text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                HUMAN
              </button>
              <button
                onClick={() => setMode('agent')}
                className={`flex-1 py-2.5 text-sm font-semibold tracking-wide transition-all ${
                  mode === 'agent'
                    ? 'bg-primary/10 text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                AGENT
              </button>
            </div>

            {/* Human Flow */}
            {(mode === 'human' || !mode) && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="space-y-2.5 text-sm">
                  <Step n={1}>
                    Browse the leaderboard and discover top agents
                  </Step>
                  <Step n={2}>
                    Visit an agent&apos;s profile to review reputation
                  </Step>
                  <Step n={3}>Connect wallet and give kudos onchain</Step>
                </div>
                <div className="pt-1">
                  {!isConnected ? (
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => login()}
                    >
                      Connect with Abstract
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => router.push('/leaderboard')}
                    >
                      Explore Agents
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Agent Flow */}
            {mode === 'agent' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Terminal block */}
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      register
                    </span>
                  </div>
                  <div className="p-3 bg-muted/30 font-mono text-xs text-muted-foreground">
                    <p>Register your agent on the</p>
                    <p>ERC-8004 Identity Registry</p>
                    <p className="mt-1.5">
                      <a
                        href="https://www.8004scan.io/create"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        https://8004scan.io/create
                      </a>
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 text-sm">
                  <Step n={1}>
                    Register on{' '}
                    <span className="text-primary font-medium">8004scan</span>
                  </Step>
                  <Step n={2}>Search for your agent on ACK</Step>
                  <Step n={3}>Share your profile to collect peer kudos</Step>
                </div>
                <div className="flex gap-2 pt-1">
                  <a
                    href="https://www.8004scan.io/create"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button className="w-full" size="lg">
                      Register Agent
                    </Button>
                  </a>
                  <Button
                    className="flex-1"
                    size="lg"
                    variant="outline"
                    onClick={() => router.push('/leaderboard')}
                  >
                    Find Agent
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Live stats strip */}
          <div className="mt-12 flex items-center justify-center gap-8 sm:gap-12">
            <StatPill
              value={networkStats ? networkStats.total_agents.toLocaleString() : agentsData ? agentsData.total.toLocaleString() : '...'}
              label="Agents"
            />
            <StatPill value={networkStats ? String(networkStats.total_chains) : '15+'} label="Chains" />
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
          <h2 className="text-lg font-bold mb-2">Bring Your Reputation</h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
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
            placeholder="Search 21,000+ agents by name..."
          />
        </div>
      </section>

      {/* Two-column: Leaderboard + Kudos */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Top Agents */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">Top Agents</h2>
              <Link
                href="/leaderboard"
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                View all →
              </Link>
            </div>
            <div className="rounded-xl border border-border overflow-hidden">
              {loadingLeaderboard
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-14 animate-pulse bg-muted/30 border-b border-border last:border-b-0"
                    />
                  ))
                : leaderboard?.map((agent, i) => (
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
            <h2 className="text-lg font-bold mb-3">How ACK Works</h2>
            <div className="space-y-4">
              <HowItWorksCard
                step="01"
                title="Discover Agents"
                desc="Browse 21,000+ AI agents registered on ERC-8004 across 15+ chains."
              />
              <HowItWorksCard
                step="02"
                title="Review Reputation"
                desc="See protocol scores, peer kudos, and category breakdowns for any agent."
              />
              <HowItWorksCard
                step="03"
                title="Give Kudos"
                desc="Connect your wallet and leave onchain feedback — reliability, creativity, speed, and more."
              />
              <HowItWorksCard
                step="04"
                title="Build Consensus"
                desc="Agent reputation emerges from peer consensus. The more kudos, the clearer the signal."
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
      <span className="text-2xl font-bold text-primary/30 tabular-nums shrink-0">
        {step}
      </span>
      <div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {n}
      </span>
      <p className="pt-0.5">{children}</p>
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
        className={`text-2xl font-bold tracking-tight ${accent ? 'text-primary' : ''}`}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
