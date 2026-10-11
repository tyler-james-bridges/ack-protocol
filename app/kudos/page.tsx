'use client';

import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Nav } from '@/components/nav';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { KudosForm } from '@/components/kudos-form';
import { CategoryBadge } from '@/components/category-badge';
import {
  KUDOS_CATEGORIES,
  CATEGORY_META,
  type KudosCategory,
} from '@/config/contract';
import {
  getChainName,
  useGiveKudos,
  useRecentKudos,
  useIsAgent,
  useLeaderboard,
  useStreaksBulk,
} from '@/hooks';
import type { RecentKudos } from '@/hooks';
import type { ScanAgent } from '@/lib/api';
import { AgentAvatar } from '@/components/agent-avatar';
import { IdentityBadge } from '@/components/identity-badge';
import { StreakBadge } from '@/components/streak-badge';
import {
  useBlockTimestamps,
  formatRelativeTime,
} from '@/hooks/useBlockTimestamps';
import Link from 'next/link';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ABSTRACT_CHAIN_ID,
  DEFAULT_8004_CHAIN_ID,
  getAgentPath,
  getChainSlug,
  resolveChainId,
} from '@/config/chain';
import { motion, AnimatePresence } from 'framer-motion';
import { latestDistinctAgents } from '@/lib/activity';
import { useTipsForKudos, type TipInfo } from '@/hooks/useTipsForKudos';
import { TipBadge, TipAttribution } from '@/components/tip-badge';

function RecentList({
  kudos,
  agentSet,
  agentMap,
  senderMap,
  timestamps,
  streaksData,
  tipMap,
}: {
  kudos: RecentKudos[];
  agentSet?: Set<string>;
  agentMap: Map<number, ScanAgent>;
  senderMap: Map<string, ScanAgent>;
  timestamps?: Map<string, number>;
  streaksData?: Record<
    string,
    { currentStreak: number; isActiveToday: boolean }
  >;
  tipMap: Record<string, TipInfo>;
}) {
  if (kudos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No kudos in this category yet.
      </p>
    );
  }
  return (
    <div className="border border-border divide-y divide-border">
      {kudos.map((k) => (
        <RecentKudosCard
          key={k.txHash}
          kudos={k}
          isAgent={agentSet?.has(k.sender.toLowerCase()) ?? false}
          agent={agentMap.get(k.agentId)}
          senderAgent={senderMap.get(k.sender.toLowerCase())}
          timestamp={timestamps?.get(k.blockNumber.toString())}
          senderStreak={streaksData?.[k.sender.toLowerCase()]}
          tipInfo={tipMap[k.txHash.toLowerCase()]}
        />
      ))}
    </div>
  );
}

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function RecentKudosCard({
  kudos,
  isAgent,
  agent,
  senderAgent,
  timestamp,
  senderStreak,
  tipInfo,
}: {
  kudos: RecentKudos;
  isAgent: boolean;
  agent?: ScanAgent;
  senderAgent?: ScanAgent;
  timestamp?: number;
  senderStreak?: { currentStreak: number; isActiveToday: boolean };
  tipInfo?: TipInfo;
}) {
  const isValidCategory = KUDOS_CATEGORIES.includes(
    kudos.tag2 as KudosCategory
  );
  const senderName = senderAgent?.name || truncateAddress(kudos.sender);
  const receiverName = agent?.name || `Agent #${kudos.agentId}`;
  const senderLink = senderAgent
    ? `/agent/${senderAgent.chain_id}/${senderAgent.token_id}`
    : `/address/${kudos.sender}`;

  return (
    <div className="px-4 py-3 bg-background">
      <div className="flex items-center gap-1.5 flex-wrap mb-1">
        <Link href={senderLink} className="shrink-0">
          <AgentAvatar
            name={senderName}
            imageUrl={senderAgent?.image_url}
            size={32}
          />
        </Link>
        <Link
          href={senderLink}
          className={`text-xs sm:text-sm hover:text-foreground transition-colors shrink-0 ${senderAgent ? 'font-semibold text-foreground' : ' text-muted-foreground'}`}
        >
          {senderName}
        </Link>
        <IdentityBadge type={isAgent ? 'agent' : 'human'} />
        {senderStreak && senderStreak.currentStreak > 0 && (
          <StreakBadge
            streak={senderStreak.currentStreak}
            isActive={senderStreak.isActiveToday}
            size="sm"
          />
        )}
        <span className="text-muted-foreground text-xs shrink-0">to</span>
        <Link
          href={getAgentPath(kudos.agentId, kudos.chainId)}
          className="shrink-0"
        >
          <AgentAvatar
            name={receiverName}
            imageUrl={agent?.image_url}
            size={32}
          />
        </Link>
        <Link
          href={getAgentPath(kudos.agentId, kudos.chainId)}
          className="text-xs sm:text-sm font-semibold text-foreground hover:text-foreground transition-colors truncate"
        >
          {receiverName}
        </Link>
        {isValidCategory && (
          <CategoryBadge category={kudos.tag2 as KudosCategory} />
        )}
      </div>
      {kudos.message && (
        <p className="text-xs sm:text-sm text-muted-foreground my-1 line-clamp-3">
          &ldquo;{kudos.message}&rdquo;
        </p>
      )}

      <div className="flex items-center gap-1.5">
        {tipInfo && tipInfo.amountUsd > 0 && (
          <TipBadge amountUsd={tipInfo.amountUsd} />
        )}
        <a
          href={`/kudos/${kudos.txHash}`}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {timestamp
            ? formatRelativeTime(timestamp)
            : `Block #${kudos.blockNumber.toString()}`}
        </a>
      </div>
      {tipInfo?.fromAddress && (
        <TipAttribution
          fromAddress={tipInfo.fromAddress}
          fromAgent={tipInfo.fromAgent}
        />
      )}
    </div>
  );
}

export default function GiveKudosPage() {
  const [activeFilter, setActiveFilter] = useState<KudosCategory | 'all'>(
    'all'
  );
  const searchParams = useSearchParams();
  const feedChain =
    resolveChainId(searchParams.get('chain') ?? undefined) ??
    DEFAULT_8004_CHAIN_ID;
  const { openConnectModal } = useConnectModal();
  const { address, isConnected, status: accountStatus } = useAccount();
  const { giveKudos, status, txHash, reset, isLoading } = useGiveKudos();
  const {
    data: recentKudos,
    isLoading: loadingFeed,
    isError: feedError,
  } = useRecentKudos(feedChain);
  const blockNumbers = recentKudos?.map((k) => k.blockNumber) || [];
  const { data: timestamps } = useBlockTimestamps(blockNumbers);
  const senders = recentKudos?.map((k) => k.sender) || [];
  const kudosTxHashes = recentKudos?.map((k) => k.txHash) || [];
  const { data: agentSet } = useIsAgent(senders);
  const tipMap = useTipsForKudos(kudosTxHashes);
  const { data: agents } = useLeaderboard({
    limit: 50,
    chainId: feedChain,
    sortBy: 'total_score',
  });

  const agentMap = new Map<number, ScanAgent>();
  const senderMap = new Map<string, ScanAgent>();
  if (agents) {
    for (const a of agents) {
      agentMap.set(Number(a.token_id), a);
      if (a.owner_address) senderMap.set(a.owner_address.toLowerCase(), a);
      if (a.agent_wallet) senderMap.set(a.agent_wallet.toLowerCase(), a);
    }
  }

  // Fetch streaks for all senders
  const streakAddresses = [
    ...new Set(recentKudos?.map((k) => k.sender.toLowerCase()) || []),
  ];
  const { data: streaksData } = useStreaksBulk(streakAddresses);

  const handleSubmit = (data: {
    agent: { token_id: string; chain_id?: number };
    category: string;
    message: string;
  }) => {
    if (!address) return;
    giveKudos({
      agentId: Number(data.agent.token_id),
      category: data.category as Parameters<typeof giveKudos>[0]['category'],
      message: data.message,
      clientAddress: address,
      targetChainId: data.agent.chain_id,
    });
  };

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="mx-auto max-w-5xl px-4 pt-4">
        <Breadcrumbs
          items={[{ label: 'Home', href: '/' }]}
          current="Give Kudos"
        />
      </div>

      <div className="mx-auto max-w-5xl px-4 pt-10 pb-16 lg:grid lg:grid-cols-2 lg:gap-16 lg:items-start">
        <AnimatePresence mode="wait">
          {status === 'success' ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-6 pt-12"
            >
              <div className="text-6xl">&#127881;</div>
              <h1 className="text-3xl md:text-4xl font-bold">Kudos Sent!</h1>
              <p className="text-muted-foreground">
                Your kudos is now onchain on the ERC-8004 Reputation Registry.
              </p>
              {txHash && (
                <a
                  href={`/kudos/${txHash}`}
                  className="text-sm text-foreground hover:underline"
                >
                  View transaction
                </a>
              )}
              <div className="flex gap-3 justify-center pt-4">
                <Button onClick={reset}>Give Another</Button>
                <Link href="/">
                  <Button variant="outline">Back to Home</Button>
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h1 className="type-title">Give kudos</h1>
                <p className="text-muted-foreground md:text-lg">
                  Recognize an agent for great work. Your kudos goes directly
                  onchain via ERC-8004.
                </p>
              </div>

              {accountStatus === 'reconnecting' ? (
                <p className="text-sm text-muted-foreground">
                  Reconnecting wallet...
                </p>
              ) : (
                <>
                  <KudosForm
                    onSubmit={
                      isConnected
                        ? handleSubmit
                        : () => {
                            openConnectModal?.();
                          }
                    }
                    isLoading={isLoading}
                    submitLabel={
                      isConnected ? 'Give Kudos' : 'Connect wallet to send'
                    }
                  />
                  {!isConnected && (
                    <p className="text-sm text-muted-foreground">
                      Pick an agent now. Sending kudos uses your wallet.
                    </p>
                  )}

                  {status === 'error' && (
                    <p className="text-sm text-foreground text-center">
                      Something went wrong. Please try again.
                    </p>
                  )}

                  {(status === 'confirming' || status === 'waiting') && (
                    <div className="text-center text-sm text-muted-foreground space-y-1">
                      {status === 'confirming' && (
                        <p>Confirm in your wallet...</p>
                      )}
                      {status === 'waiting' && (
                        <p>Waiting for confirmation...</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent Kudos Feed */}
        <div className="mt-12 space-y-4 lg:mt-0">
          <div className="space-y-1">
            <h2 className="text-lg md:text-xl font-bold tracking-tight">
              Recent Kudos
            </h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Latest onchain kudos on {getChainName(feedChain)}.
            </p>
          </div>
          <div className="flex gap-2">
            {[DEFAULT_8004_CHAIN_ID, ABSTRACT_CHAIN_ID].map((id) => (
              <Link
                key={id}
                href={`/kudos?chain=${getChainSlug(id)}`}
                className={`rounded-md border px-3 py-1 text-xs font-medium ${
                  feedChain === id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                {getChainName(id)}
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                activeFilter === 'all'
                  ? 'bg-primary text-primary-foreground border-border'
                  : 'bg-background text-muted-foreground border-border hover:border-border'
              }`}
            >
              All
            </button>
            {KUDOS_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveFilter(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  activeFilter === cat
                    ? 'bg-primary text-primary-foreground border-border'
                    : 'bg-background text-muted-foreground border-border hover:border-border'
                }`}
              >
                {CATEGORY_META[cat].label}
              </button>
            ))}
          </div>

          {loadingFeed ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="border border-border rounded-lg p-4 animate-pulse"
                >
                  <div className="h-4 bg-muted rounded w-2/3 mb-3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : feedError ? (
            <div className="border border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Could not load kudos for {getChainName(feedChain)}.
              </p>
            </div>
          ) : !recentKudos?.length ? (
            <div className="border border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No onchain kudos yet. Be the first!
              </p>
            </div>
          ) : (
            <RecentList
              kudos={latestDistinctAgents(
                recentKudos.filter(
                  (k) => activeFilter === 'all' || k.tag2 === activeFilter
                ),
                8
              )}
              agentSet={agentSet}
              agentMap={agentMap}
              senderMap={senderMap}
              timestamps={timestamps}
              streaksData={streaksData}
              tipMap={tipMap}
            />
          )}
        </div>
      </div>
    </div>
  );
}
