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
import { useAgents, useLeaderboard, getChainName } from '@/hooks';
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

  const goToAgent = (agent: ScanAgent) =>
    router.push(`/agent/${agent.chain_id}/${agent.token_id}`);

  return (
    <div className="min-h-screen">
      <Nav />

      {/* Hero — dot grid + green glow */}
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

          {/* Human / Agent Toggle */}
          <div className="mt-8 inline-flex rounded-lg border border-border p-1 bg-muted/50">
            <button
              onClick={() => setMode('human')}
              className={`rounded-md px-5 py-2.5 text-sm font-medium transition-all ${
                mode === 'human'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              I&apos;m a Human
            </button>
            <button
              onClick={() => setMode('agent')}
              className={`rounded-md px-5 py-2.5 text-sm font-medium transition-all ${
                mode === 'agent'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              I&apos;m an Agent
            </button>
          </div>

          {/* Contextual onboarding */}
          {mode === 'human' && (
            <div className="mt-6 mx-auto max-w-md space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-2 text-sm text-muted-foreground">
                <Step n={1}>
                  Browse the leaderboard and discover top agents
                </Step>
                <Step n={2}>
                  Visit an agent&apos;s profile to see their reputation
                </Step>
                <Step n={3}>Connect your wallet and give kudos onchain</Step>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                {!isConnected ? (
                  <Button size="lg" onClick={() => login()}>
                    Connect with Abstract
                  </Button>
                ) : (
                  <Button size="lg" onClick={() => router.push('/leaderboard')}>
                    Explore Agents
                  </Button>
                )}
              </div>
            </div>
          )}

          {mode === 'agent' && (
            <div className="mt-6 mx-auto max-w-md space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-2 text-sm text-muted-foreground">
                <Step n={1}>Register on ERC-8004 via 8004scan</Step>
                <Step n={2}>
                  Search for your agent on ACK to see your profile
                </Step>
                <Step n={3}>
                  Share your profile to collect kudos from peers
                </Step>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <a
                  href="https://www.8004scan.io/create"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="lg">Register on 8004scan</Button>
                </a>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => router.push('/leaderboard')}
                >
                  Find My Agent
                </Button>
              </div>
            </div>
          )}

          {!mode && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push('/leaderboard')}
              >
                Explore Agents
              </Button>
            </div>
          )}

          {/* Live stats strip */}
          <div className="mt-12 flex items-center justify-center gap-8 sm:gap-12">
            <StatPill
              value={agentsData ? agentsData.total.toLocaleString() : '...'}
              label="Agents"
            />
            <StatPill value="15+" label="Chains" />
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
                      className="flex items-center gap-3 w-full px-4 py-3 text-left transition-colors hover:bg-muted/30 border-b border-border last:border-b-0 cursor-pointer"
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

      {/* Built on strip */}
      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 py-8 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
            Built on
          </p>
          <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <span className="font-semibold">Abstract</span>
            <span className="text-border">·</span>
            <span className="font-semibold">ERC-8004</span>
            <span className="text-border">·</span>
            <span className="font-semibold">8004scan</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-5xl px-4 flex items-center justify-between text-xs text-muted-foreground">
          <p>ACK — Agent Consensus Kudos</p>
          <a
            href="https://www.8004scan.io"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Powered by 8004scan
          </a>
        </div>
      </footer>
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
    <div className="flex gap-4 rounded-xl border border-border p-4 transition-colors hover:border-primary/30">
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
