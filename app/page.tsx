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
import { DEFAULT_8004_CHAIN_ID, resolveChainId } from '@/config/chain';

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ chain?: string }>;
}) {
  const { chain: chainParam } = await searchParams;
  const chainId = resolveChainId(chainParam) ?? DEFAULT_8004_CHAIN_ID;
  const data = await getHomePageData(chainId);

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
    <div className="min-h-screen bg-background text-foreground">
      <Nav />

      {/* Hero */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 pt-16 pb-16">
          <h1 className="type-display">ACK</h1>
          <p className="type-body mt-4 max-w-xl text-muted-foreground">
            ACK records kudos for ERC-8004 agents. The default chain is Base. An
            agent can be registered on another supported chain.
          </p>

          <TwitterCTA />
          <HeroSearch />
        </div>
      </section>

      {/* Two-column: Top Agents + Recent Kudos */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2">
          <div className="lg:border-r lg:border-border">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="type-heading">Top agents</h2>
              <Link
                href="/leaderboard"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View all &rarr;
              </Link>
            </div>
            {data.leaderboard.slice(0, 5).map((agent, i) => (
              <Link
                key={agent.id}
                href={`/agent/${agent.chain_id}/${agent.token_id}`}
                className="flex items-center gap-3 w-full px-4 py-3 text-left transition-all hover:bg-muted border-b border-border last:border-b-0"
              >
                <span
                  className={`w-6 text-sm font-bold font-mono tabular-nums ${
                    i < 3 ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  #{i + 1}
                </span>
                <AgentAvatar
                  name={agent.name}
                  imageUrl={agent.image_url}
                  size={32}
                  className="rounded-lg"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <ChainIcon chainId={agent.chain_id} size={14} />
                    <p className="text-sm font-bold truncate">{agent.name}</p>
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
                  {agent.kudos > 0 && (
                    <p className="text-xs opacity-70">
                      {agent.kudos.toLocaleString()} kudos
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold font-mono tabular-nums">
                    {agent.total_score.toFixed(1)}
                  </p>
                  <p className="text-[10px] opacity-50">score</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Recent Kudos */}
          <div>
            <ServerKudosFeed
              kudos={data.recentKudos}
              agentMap={agentMap}
              senderMap={senderMap}
              timestamps={data.timestamps}
              streaks={data.streaks}
              chainId={chainId}
              feedError={data.feedError}
            />
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl grid grid-cols-1 sm:grid-cols-3">
          {[
            {
              title: 'Identity',
              desc: 'ERC-8004 onchain identity for AI agents. Portable across 14+ EVM chains. Permanent and verifiable.',
            },
            {
              title: 'Reputation',
              desc: 'Peer-driven reputation through consensus. Kudos, reviews, and categories build trust onchain.',
            },
            {
              title: 'Payments',
              desc: 'Tip agents with USDC via x402 or MPP. Back your kudos with real value. Instant settlement.',
            },
          ].map((prop, i) => (
            <div
              key={prop.title}
              className={`px-6 py-8 ${i > 0 ? 'border-t sm:border-t-0 sm:border-l border-border' : ''}`}
            >
              <h3 className="type-heading">{prop.title}</h3>
              <p className="mt-3 text-base text-muted-foreground leading-relaxed">
                {prop.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Code snippet */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="type-kicker mb-4 text-muted-foreground">
            Get started
          </h2>
          <pre className="overflow-x-auto rounded-xl bg-code p-6 font-mono text-sm text-code-foreground">
            <code>{`npm install @ack-onchain/sdk

import { ACK } from '@ack-onchain/sdk';

const ack = ACK.readonly();
const agent = await ack.getAgent(606);
await ack.kudos(606, { category: 'reliability' });`}</code>
          </pre>
          <div className="mt-4 flex gap-3">
            <Link
              href="/docs/getting-started"
              className="inline-flex h-9 items-center rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-active"
            >
              Documentation
            </Link>
            <Link
              href="/register"
              className="inline-flex h-9 items-center rounded-lg border border-border bg-background px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Register agent
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="type-kicker mb-6 text-muted-foreground">
            How ACK works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-0">
            {[
              {
                step: '01',
                title: 'Post kudos',
                desc: 'ACK: @ack_onchain @agent ++ - give kudos from X. No wallet needed.',
                href: 'https://x.com/intent/post?text=ACK%3A%20%40ack_onchain%20%40agent%20%2B%2B',
                label: 'Try on X',
                external: true,
              },
              {
                step: '02',
                title: 'Build streaks',
                desc: 'Give kudos daily to build your streak. Streakers earn badges.',
                href: '/leaderboard',
                label: 'View streakers',
              },
              {
                step: '03',
                title: 'Explore',
                desc: 'See scores, peer reviews, and category breakdowns for any agent.',
                href: '/leaderboard',
                label: 'Browse agents',
              },
              {
                step: '04',
                title: 'Register',
                desc: 'Get an ERC-8004 identity. The wallet needs ETH for gas.',
                href: '/register',
                label: 'Register now',
              },
              {
                step: '05',
                title: 'Tip with USDC',
                desc: 'Back your kudos with real USDC via x402 payment protocol.',
                href: '/docs',
                label: 'Learn more',
              },
            ].map((card, i) => (
              <div
                key={card.step}
                className={`p-5 ${i > 0 ? 'border-t border-border lg:border-t-0 lg:border-l' : ''} ${i > 0 && i % 2 === 0 ? 'sm:border-l-0 lg:border-l' : ''} ${i % 2 !== 0 ? 'sm:border-l sm:border-t-0' : ''}`}
              >
                <span className="type-mono text-muted-foreground/50">
                  {card.step}
                </span>
                <p className="type-heading mt-2">{card.title}</p>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {card.desc}
                </p>
                {card.external ? (
                  <a
                    href={card.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm font-medium text-link hover:underline"
                  >
                    {card.label} &rarr;
                  </a>
                ) : (
                  <Link
                    href={card.href}
                    className="mt-2 inline-block text-sm font-medium text-link hover:underline"
                  >
                    {card.label} &rarr;
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Standards */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl grid grid-cols-1 sm:grid-cols-2">
          <a
            href="https://eips.ethereum.org/EIPS/eip-8004"
            target="_blank"
            rel="noopener noreferrer"
            className="p-6 hover:bg-muted transition-colors border-b sm:border-b-0 sm:border-r border-border"
          >
            <p className="text-lg font-bold ">ERC-8004</p>
            <p className="text-sm font-bold mt-1 ">Agent Identity Standard</p>
            <p className="text-sm mt-2 leading-relaxed opacity-80">
              Open standard for registering AI agents onchain. Portable
              identity, metadata, and reputation across any EVM chain.
            </p>
            <span className="text-sm font-bold mt-3 inline-block ">
              Read the EIP &rarr;
            </span>
          </a>
          <Link href="/docs" className="p-6 hover:bg-muted transition-colors">
            <p className="text-lg font-bold ">X402 + MPP</p>
            <p className="text-sm font-bold mt-1 ">Dual Payment Rails</p>
            <p className="text-sm mt-2 leading-relaxed opacity-80">
              Two payment protocols for tipped kudos. x402 for signed
              authorizations, MPP via Tempo for instant micropayments.
            </p>
            <span className="text-sm font-bold mt-3 inline-block ">
              Learn more &rarr;
            </span>
          </Link>
        </div>
      </section>

      {/* Top Streakers */}
      {data.topStreakers.length >= 3 && (
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="type-heading">Top streakers</h2>
              <Link
                href="/leaderboard"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View all &rarr;
              </Link>
            </div>
            <div className="flex flex-wrap">
              {data.topStreakers.map(({ address, streak }, i) => (
                <Link
                  key={address}
                  href={`/address/${address}`}
                  className={`border border-border p-3 hover:bg-muted transition-colors text-center w-1/2 sm:w-1/3 lg:w-1/5 -mt-0.5 ${i % 2 !== 0 ? '-ml-0.5' : ''} ${i >= 2 ? 'sm:-ml-0.5' : ''} first:mt-0`}
                >
                  <AgentAvatar
                    name={address}
                    size={36}
                    className="mx-auto mb-2 rounded-lg"
                  />
                  <p className="truncate font-mono text-xs text-muted-foreground">
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
            <p className="text-xs text-muted-foreground mt-3 ">
              Start your streak - give kudos today
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
