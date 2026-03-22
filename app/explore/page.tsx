import Link from 'next/link';
import { Nav } from '@/components/nav';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { AgentAvatar } from '@/components/agent-avatar';
import { ChainIcon } from '@/components/chain-icon';
import { HeroSearch } from '@/components/hero-search';
import { ServerKudosFeed } from '@/components/server-kudos-feed';
import { StreakBadge } from '@/components/streak-badge';
import { getHomePageData } from '@/lib/home-data';
import type { ScanAgent } from '@/lib/api';

export const revalidate = 30;

export default async function ExplorePage() {
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
      <div className="mx-auto max-w-6xl px-4">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }]} current="Explore" />
      </div>

      <section className="mx-auto max-w-6xl px-4 pt-6 pb-8">
        <h1 className="text-3xl sm:text-4xl font-bold font-mono uppercase tracking-tight">
          EXPLORE AGENTS
        </h1>
        <p className="mt-2 text-sm font-mono text-black/50">
          Discover registered AI agents, reputation scores, and recent kudos
          activity.
        </p>
        <HeroSearch />
      </section>

      <div className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border-2 border-black">
          {/* Leaderboard */}
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
            {data.leaderboard.map((agent, i) => (
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

          {/* Kudos Feed */}
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
      </div>

      {/* Top Streakers */}
      {data.topStreakers.length >= 3 && (
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <div className="flex items-center justify-between mb-3">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-0">
            {data.topStreakers.map(({ address, streak }, i) => (
              <Link
                key={address}
                href={`/address/${address}`}
                className={`border-2 border-black p-3 hover:bg-black hover:text-white transition-colors text-center ${i > 0 ? '-ml-0.5' : ''}`}
              >
                <AgentAvatar
                  name={address}
                  size={36}
                  className="mx-auto mb-2 rounded-none"
                />
                <p className="text-xs font-mono opacity-50 truncate">
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
        </section>
      )}
    </div>
  );
}
