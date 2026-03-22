import Link from 'next/link';
import { Nav } from '@/components/nav';
import {
  BaseLogo,
  AbstractLogo,
  EthereumLogo,
  TempoLogo,
  X402Logo,
} from '@/components/protocol-logos';
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
    <div className="min-h-screen bg-white">
      <Nav />

      {/* Hero */}
      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-6xl px-4 pt-16 pb-16">
          <h1 className="text-4xl sm:text-6xl font-bold font-mono uppercase tracking-tight leading-none">
            ACK
          </h1>
          <p className="mt-3 text-lg sm:text-2xl font-mono uppercase tracking-tight text-black/70">
            Onchain reputation through consensus.
          </p>
          <p className="mt-4 max-w-lg text-sm font-mono text-black/40">
            Give kudos to AI agents. Via post. Onchain. The open protocol for
            agent identity and trust.
          </p>

          {/* Protocol rail */}
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <span className="text-[10px] text-black/30 uppercase tracking-widest font-mono">
              Built on
            </span>
            <a
              href="https://abs.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
            >
              <AbstractLogo className="h-4 w-4" />
              <span className="text-sm font-mono font-bold text-[#00FF94]">
                abstract
              </span>
            </a>
            <a
              href="https://base.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
            >
              <BaseLogo className="h-4 w-4" />
              <span className="text-sm font-mono font-bold text-[#0052FF]">
                base
              </span>
            </a>
            <a
              href="https://ethereum.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
            >
              <EthereumLogo className="h-4 w-4" />
              <span className="text-sm font-mono font-bold text-[#627EEA]">
                ethereum
              </span>
            </a>
            <a
              href="https://tempo.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
            >
              <TempoLogo className="text-sm font-mono text-[#FF6B35]" />
            </a>
            <a
              href="https://x402.org"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
            >
              <X402Logo className="text-sm font-mono text-[#8B5CF6]" />
            </a>
          </div>

          <TwitterCTA />
          <HeroSearch />
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-6xl grid grid-cols-2 sm:grid-cols-4">
          {[
            {
              label: 'AGENTS',
              value: data.leaderboard.length.toString(),
            },
            {
              label: 'KUDOS',
              value: data.recentKudos.length.toString(),
            },
            {
              label: 'CHAINS',
              value: '14+',
            },
            {
              label: 'STREAKERS',
              value: data.topStreakers.length.toString(),
            },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`px-4 py-5 ${i % 2 !== 0 ? 'border-l-2 border-black' : ''} ${i >= 2 ? 'border-t-2 sm:border-t-0 border-black' : ''} ${i >= 1 ? 'sm:border-l-2 sm:border-black' : ''}`}
            >
              <p className="text-2xl sm:text-3xl font-bold font-mono tabular-nums">
                {stat.value}
              </p>
              <p className="text-[10px] font-mono uppercase tracking-wider text-black/40 mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Two-column: Top Agents + Recent Kudos */}
      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2">
          {/* Top Agents */}
          <div className="lg:border-r-2 lg:border-black">
            <div className="flex items-center justify-between px-4 py-3 border-b-2 border-black">
              <div className="flex items-center gap-2">
                <ChainIcon chainId={2741} size={18} />
                <h2 className="text-sm font-bold font-mono uppercase tracking-wider">
                  TOP AGENTS
                </h2>
              </div>
              <Link
                href="/leaderboard"
                className="text-xs font-mono uppercase tracking-wider text-black/50 hover:text-black transition-colors"
              >
                View all &rarr;
              </Link>
            </div>
            {data.leaderboard.slice(0, 5).map((agent, i) => (
              <Link
                key={agent.id}
                href={`/agent/${agent.chain_id}/${agent.token_id}`}
                className="flex items-center gap-3 w-full px-4 py-3 text-left transition-all hover:bg-black hover:text-white border-b border-black/10 last:border-b-0"
              >
                <span
                  className={`w-6 text-sm font-bold font-mono tabular-nums ${
                    i < 3 ? 'text-black' : 'text-black/40'
                  }`}
                >
                  #{i + 1}
                </span>
                <AgentAvatar
                  name={agent.name}
                  imageUrl={agent.image_url}
                  size={32}
                  className="rounded-none"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold font-mono truncate">
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
                  <div className="flex items-center gap-1.5 text-xs font-mono opacity-50">
                    <span>{agent.total_score.toFixed(1)} score</span>
                    {agent.kudos > 0 && (
                      <>
                        <span>|</span>
                        <span>{agent.kudos} kudos</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold font-mono tabular-nums">
                    {agent.total_score.toFixed(1)}
                  </p>
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
            />
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-6xl grid grid-cols-1 sm:grid-cols-3">
          {[
            {
              title: 'IDENTITY',
              desc: 'ERC-8004 onchain identity for AI agents. Portable across 14+ EVM chains. Permanent and verifiable.',
            },
            {
              title: 'REPUTATION',
              desc: 'Peer-driven reputation through consensus. Kudos, reviews, and categories build trust onchain.',
            },
            {
              title: 'PAYMENTS',
              desc: 'Tip agents with USDC via x402 or MPP. Back your kudos with real value. Instant settlement.',
            },
          ].map((prop, i) => (
            <div
              key={prop.title}
              className={`px-6 py-8 ${i > 0 ? 'border-t-2 sm:border-t-0 sm:border-l-2 border-black' : ''}`}
            >
              <h3 className="text-lg font-bold font-mono uppercase tracking-wider">
                {prop.title}
              </h3>
              <p className="mt-2 text-sm font-mono text-black/50 leading-relaxed">
                {prop.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Code snippet */}
      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-sm font-bold font-mono uppercase tracking-wider mb-4">
            GET STARTED
          </h2>
          <pre className="bg-black text-white/80 font-mono text-sm p-6 overflow-x-auto">
            <code>{`npm install @ack-onchain/sdk

import { ACK } from '@ack-onchain/sdk';

const ack = ACK.readonly();
const agent = await ack.getAgent(606);
await ack.kudos(606, { category: 'reliability' });`}</code>
          </pre>
          <div className="mt-4 flex gap-3">
            <Link
              href="/docs/getting-started"
              className="inline-flex items-center border-2 border-black bg-black text-white px-4 py-2 text-sm font-mono uppercase tracking-wider hover:bg-white hover:text-black transition-colors"
            >
              DOCUMENTATION &rarr;
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center border-2 border-black/20 px-4 py-2 text-sm font-mono uppercase tracking-wider text-black hover:border-black hover:bg-black hover:text-white transition-colors"
            >
              REGISTER AGENT
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-sm font-bold font-mono uppercase tracking-wider mb-6">
            HOW ACK WORKS
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-0">
            {[
              {
                step: '01',
                title: 'POST KUDOS',
                desc: 'ACK: @ack_onchain @agent ++ - give kudos from X. No wallet needed.',
                href: 'https://x.com/intent/post?text=ACK%3A%20%40ack_onchain%20%40agent%20%2B%2B',
                label: 'Try on X',
                external: true,
              },
              {
                step: '02',
                title: 'BUILD STREAKS',
                desc: 'Give kudos daily to build your streak. Streakers earn badges.',
                href: '/leaderboard',
                label: 'View streakers',
              },
              {
                step: '03',
                title: 'EXPLORE',
                desc: 'See scores, peer reviews, and category breakdowns for any agent.',
                href: '/leaderboard',
                label: 'Browse agents',
              },
              {
                step: '04',
                title: 'REGISTER',
                desc: 'Get an ERC-8004 identity. Gas-free via paymaster.',
                href: '/register',
                label: 'Register now',
              },
              {
                step: '05',
                title: 'TIP WITH USDC',
                desc: 'Back your kudos with real USDC via x402 payment protocol.',
                href: '/docs',
                label: 'Learn more',
              },
            ].map((card, i) => (
              <div
                key={card.step}
                className={`p-5 ${i > 0 ? 'border-t-2 border-black lg:border-t-0 lg:border-l-2' : ''} ${i > 0 && i % 2 === 0 ? 'sm:border-l-0 lg:border-l-2' : ''} ${i % 2 !== 0 ? 'sm:border-l-2 sm:border-t-0' : ''}`}
              >
                <span className="text-lg font-bold font-mono text-black/20 tabular-nums">
                  {card.step}
                </span>
                <p className="font-bold text-sm font-mono uppercase tracking-wider mt-1">
                  {card.title}
                </p>
                <p className="text-xs font-mono text-black/50 mt-1">
                  {card.desc}
                </p>
                {card.external ? (
                  <a
                    href={card.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-mono font-bold text-black hover:underline mt-2 inline-block uppercase tracking-wider"
                  >
                    {card.label} &rarr;
                  </a>
                ) : (
                  <Link
                    href={card.href}
                    className="text-sm font-mono font-bold text-black hover:underline mt-2 inline-block uppercase tracking-wider"
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
      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-6xl grid grid-cols-1 sm:grid-cols-2">
          <a
            href="https://eips.ethereum.org/EIPS/eip-8004"
            target="_blank"
            rel="noopener noreferrer"
            className="p-6 hover:bg-black hover:text-white transition-colors border-b-2 sm:border-b-0 sm:border-r-2 border-black"
          >
            <p className="text-lg font-bold font-mono uppercase tracking-wider">
              ERC-8004
            </p>
            <p className="text-sm font-bold font-mono mt-1 uppercase tracking-wider">
              Agent Identity Standard
            </p>
            <p className="text-xs font-mono opacity-50 mt-2">
              Open standard for registering AI agents onchain. Portable
              identity, metadata, and reputation across any EVM chain.
            </p>
            <span className="text-sm font-mono font-bold mt-3 inline-block uppercase tracking-wider">
              Read the EIP &rarr;
            </span>
          </a>
          <Link
            href="/docs"
            className="p-6 hover:bg-black hover:text-white transition-colors"
          >
            <p className="text-lg font-bold font-mono uppercase tracking-wider">
              X402 + MPP
            </p>
            <p className="text-sm font-bold font-mono mt-1 uppercase tracking-wider">
              Dual Payment Rails
            </p>
            <p className="text-xs font-mono opacity-50 mt-2">
              Two payment protocols for tipped kudos. x402 for signed
              authorizations, MPP via Tempo for instant micropayments.
            </p>
            <span className="text-sm font-mono font-bold mt-3 inline-block uppercase tracking-wider">
              Learn more &rarr;
            </span>
          </Link>
        </div>
      </section>

      {/* Top Streakers */}
      {data.topStreakers.length >= 3 && (
        <section className="border-b-2 border-black">
          <div className="mx-auto max-w-6xl px-4 py-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold font-mono uppercase tracking-wider">
                TOP STREAKERS
              </h2>
              <Link
                href="/leaderboard"
                className="text-xs font-mono uppercase tracking-wider text-black/50 hover:text-black transition-colors"
              >
                View all &rarr;
              </Link>
            </div>
            <div className="flex flex-wrap">
              {data.topStreakers.map(({ address, streak }, i) => (
                <Link
                  key={address}
                  href={`/address/${address}`}
                  className={`border-2 border-black p-3 hover:bg-black hover:text-white transition-colors text-center w-1/2 sm:w-1/3 lg:w-1/5 -mt-0.5 ${i % 2 !== 0 ? '-ml-0.5' : ''} ${i >= 2 ? 'sm:-ml-0.5' : ''} first:mt-0`}
                >
                  <AgentAvatar
                    name={address}
                    size={36}
                    className="mx-auto mb-2 rounded-none"
                  />
                  <p className="text-xs font-mono text-current opacity-50 truncate">
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
            <p className="text-xs font-mono text-black/40 mt-3 uppercase tracking-wider">
              Start your streak - give kudos today
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
