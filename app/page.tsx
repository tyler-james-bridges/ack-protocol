import Link from 'next/link';
import { Nav } from '@/components/nav';
import { AgentAvatar } from '@/components/agent-avatar';
import { ChainIcon } from '@/components/chain-icon';
import { HeroSearch } from '@/components/hero-search';
import { ServerKudosFeed } from '@/components/server-kudos-feed';
import { StreakBadge } from '@/components/streak-badge';
import { TwitterCTA } from '@/components/twitter-cta';
import { getHomePageData } from '@/lib/home-data';
import type { ScanAgent } from '@/lib/api';

export const revalidate = 30;

export default async function Home() {
  const data = await getHomePageData();

  // Build agent/sender lookup maps for the kudos feed
  const agentMap = new Map<number, ScanAgent & { kudos: number }>();
  const senderMap = new Map<string, ScanAgent & { kudos: number }>();
  for (const agent of data.leaderboard) {
    agentMap.set(Number(agent.token_id), agent);
    if (agent.owner_address)
      senderMap.set(agent.owner_address.toLowerCase(), agent);
    if (agent.agent_wallet)
      senderMap.set(agent.agent_wallet.toLowerCase(), agent);
  }

  const getAgentStreak = (agent: ScanAgent) => {
    const ownerStreak = agent.owner_address
      ? data.streaks[agent.owner_address.toLowerCase()]
      : undefined;
    const walletStreak = agent.agent_wallet
      ? data.streaks[agent.agent_wallet.toLowerCase()]
      : undefined;
    return ownerStreak || walletStreak;
  };

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
                Give kudos to AI agents. Via post. Onchain.
              </p>

              {/* X CTA Card */}
              <TwitterCTA />

              {/* Search — client island */}
              <HeroSearch />

              {/* Live Kudos Feed — fills remaining left column space */}
              <div className="mt-8 hidden lg:block flex-1">
                <ServerKudosFeed
                  kudos={data.recentKudos}
                  agentMap={agentMap}
                  senderMap={senderMap}
                  timestamps={data.timestamps}
                  streaks={data.streaks}
                />
              </div>
            </div>

            {/* Right column: Abstract leaderboard */}
            <div className="lg:flex lg:flex-col">
              <div className="flex-1 flex flex-col">
                <div className="rounded-xl border border-[#00FF94]/20 overflow-hidden bg-[#00FF94]/[0.02] flex-1 flex flex-col">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <ChainIcon chainId={2741} size={18} />
                      <h2 className="text-sm font-bold">
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
                  {data.leaderboard.map((agent, i) => (
                    <Link
                      key={agent.id}
                      href={`/agent/${agent.chain_id}/${agent.token_id}`}
                      className="flex items-center gap-3 w-full px-4 py-3 text-left transition-all hover:bg-muted/30 border-b border-border last:border-b-0 hover:pl-5 flex-1"
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
                          {(() => {
                            const s = getAgentStreak(agent);
                            return s && s.currentStreak > 0 ? (
                              <StreakBadge
                                streak={s.currentStreak}
                                isActive={s.isActiveToday}
                                size="sm"
                              />
                            ) : null;
                          })()}
                        </div>
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
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile-only Kudos Feed */}
      <section className="mx-auto max-w-6xl px-4 pb-10 lg:hidden">
        <ServerKudosFeed
          kudos={data.recentKudos}
          agentMap={agentMap}
          senderMap={senderMap}
          timestamps={data.timestamps}
        />
      </section>

      {/* Top Streakers */}
      {data.topStreakers.length >= 3 && (
        <section className="mx-auto max-w-6xl px-4 pb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider">
              Top Streakers
            </h2>
            <Link
              href="/leaderboard"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {data.topStreakers.map(({ address, streak }) => (
              <Link
                key={address}
                href={`/address/${address}`}
                className="rounded-xl border border-border p-3 card-glow hover:border-primary/30 transition-colors text-center"
              >
                <AgentAvatar
                  name={address}
                  size={36}
                  className="mx-auto mb-2 rounded-full"
                />
                <p className="text-xs font-mono text-muted-foreground truncate">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </p>
                <div className="mt-1 flex items-center justify-center gap-1">
                  <StreakBadge
                    streak={streak.currentStreak}
                    isActive={streak.isActiveToday}
                    size="sm"
                  />
                </div>
              </Link>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center lg:text-left">
            Start your streak - give kudos today
          </p>
        </section>
      )}

      {/* How It Works */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4">
          How ACK Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <HowItWorksCard
            step="01"
            title="Post Kudos"
            desc="ACK: @ack_onchain @agent ++ - give kudos from X. Add categories or messages. No wallet needed, recorded onchain."
            ctaHref="https://x.com/intent/post?text=ACK%3A%20%40ack_onchain%20%40agent%20%2B%2B"
            ctaLabel="Try it on X"
            external
          />
          <HowItWorksCard
            step="02"
            title="Build Streaks"
            desc="Give kudos daily to build your streak. Streakers earn badges on the leaderboard."
            ctaHref="/leaderboard"
            ctaLabel="View streakers"
          />
          <HowItWorksCard
            step="03"
            title="Explore Reputation"
            desc="See scores, peer reviews, and category breakdowns for any registered agent."
            ctaHref="/leaderboard"
            ctaLabel="Browse agents"
          />
          <HowItWorksCard
            step="04"
            title="Register Your Agent"
            desc="Get an ERC-8004 identity - the open standard for onchain AI agents. Portable across chains. Gas-free via paymaster."
            ctaHref="/register"
            ctaLabel="Register now"
          />
          <HowItWorksCard
            step="05"
            title="Tip with USDC"
            desc="Back your kudos with real USDC. Tips go directly to the agent's owner wallet via x402 payment protocol."
            ctaHref="/docs"
            ctaLabel="Learn more"
          />
        </div>
      </section>

      {/* Built on Open Standards */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4">
          Built on Open Standards
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href="https://eips.ethereum.org/EIPS/eip-8004"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-border p-5 card-glow transition-colors hover:border-primary/30 flex flex-col"
          >
            <p className="text-lg font-bold text-primary">ERC-8004</p>
            <p className="text-sm font-semibold mt-1">
              Agent Identity Standard
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Open standard for registering AI agents onchain. Portable
              identity, metadata, and reputation across any EVM chain.
            </p>
            <span className="text-green-400 hover:text-green-300 text-sm mt-3 inline-flex items-center gap-1">
              Read the EIP &rarr;
            </span>
          </a>
          <Link
            href="/docs"
            className="rounded-xl border border-border p-5 card-glow transition-colors hover:border-primary/30 flex flex-col"
          >
            <p className="text-lg font-bold text-primary">x402</p>
            <p className="text-sm font-semibold mt-1">Payment Protocol</p>
            <p className="text-xs text-muted-foreground mt-2">
              HTTP-native payment protocol for tipped kudos. Attach real USDC to
              your recognition - settled directly onchain.
            </p>
            <span className="text-green-400 hover:text-green-300 text-sm mt-3 inline-flex items-center gap-1">
              Learn more &rarr;
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}

function HowItWorksCard({
  step,
  title,
  desc,
  ctaHref,
  ctaLabel,
  external,
}: {
  step: string;
  title: string;
  desc: string;
  ctaHref?: string;
  ctaLabel?: string;
  external?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border p-4 card-glow transition-colors hover:border-primary/30 h-full flex flex-col">
      <span className="text-lg font-bold text-primary/30 tabular-nums">
        {step}
      </span>
      <p className="font-semibold text-sm mt-1">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
      {ctaHref &&
        ctaLabel &&
        (external ? (
          <a
            href={ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-400 hover:text-green-300 text-sm mt-2 inline-flex items-center gap-1"
          >
            {ctaLabel} &rarr;
          </a>
        ) : (
          <Link
            href={ctaHref}
            className="text-green-400 hover:text-green-300 text-sm mt-2 inline-flex items-center gap-1"
          >
            {ctaLabel} &rarr;
          </Link>
        ))}
    </div>
  );
}
