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
  useGiveKudos,
  useRecentKudos,
  useIsAgent,
  useLeaderboard,
} from '@/hooks';
import type { RecentKudos } from '@/hooks';
import type { ScanAgent } from '@/lib/api';
import { AgentAvatar } from '@/components/agent-avatar';
import { IdentityBadge } from '@/components/identity-badge';
import {
  useBlockTimestamps,
  formatRelativeTime,
} from '@/hooks/useBlockTimestamps';
import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function RecentKudosCard({
  kudos,
  isAgent,
  agent,
  senderAgent,
  timestamp,
}: {
  kudos: RecentKudos;
  isAgent: boolean;
  agent?: ScanAgent;
  senderAgent?: ScanAgent;
  timestamp?: number;
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
    <div className="border border-border rounded-lg p-3 sm:p-4 bg-card hover:border-[#00DE73]/40 transition-colors">
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
          className={`text-xs sm:text-sm hover:text-[#00DE73] transition-colors shrink-0 ${senderAgent ? 'font-semibold text-foreground' : 'font-mono text-muted-foreground'}`}
        >
          {senderName}
        </Link>
        <IdentityBadge type={isAgent ? 'agent' : 'human'} />
        <span className="text-muted-foreground/40 text-xs shrink-0">to</span>
        <Link href={`/agent/2741/${kudos.agentId}`} className="shrink-0">
          <AgentAvatar
            name={receiverName}
            imageUrl={agent?.image_url}
            size={32}
          />
        </Link>
        <Link
          href={`/agent/2741/${kudos.agentId}`}
          className="text-xs sm:text-sm font-semibold text-foreground hover:text-[#00DE73] transition-colors truncate"
        >
          {receiverName}
        </Link>
        {isValidCategory && (
          <CategoryBadge category={kudos.tag2 as KudosCategory} />
        )}
      </div>
      {kudos.message && (
        <p className="text-xs sm:text-sm text-foreground/80 my-1 line-clamp-3">
          &ldquo;{kudos.message}&rdquo;
        </p>
      )}

      <a
        href={`/kudos/${kudos.txHash}`}
        className="text-[11px] text-muted-foreground/50 hover:text-[#00DE73] transition-colors"
      >
        {timestamp
          ? formatRelativeTime(timestamp)
          : `Block #${kudos.blockNumber.toString()}`}
      </a>
    </div>
  );
}

export default function GiveKudosPage() {
  const [activeFilter, setActiveFilter] = useState<KudosCategory | 'all'>(
    'all'
  );
  const { openConnectModal } = useConnectModal();
  const { address, isConnected, status: accountStatus } = useAccount();
  const { giveKudos, status, txHash, reset, isLoading } = useGiveKudos();
  const { data: recentKudos, isLoading: loadingFeed } = useRecentKudos();
  const blockNumbers = recentKudos?.map((k) => k.blockNumber) || [];
  const { data: timestamps } = useBlockTimestamps(blockNumbers);
  const senders = recentKudos?.map((k) => k.sender) || [];
  const { data: agentSet } = useIsAgent(senders);
  const { data: agents } = useLeaderboard({
    limit: 50,
    chainId: 2741,
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
      <div className="mx-auto max-w-2xl px-4 pt-4">
        <Breadcrumbs
          items={[{ label: 'Home', href: '/' }]}
          current="Give Kudos"
        />
      </div>

      <div className="mx-auto max-w-2xl px-4 pt-12 pb-16">
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
                  className="text-sm text-primary hover:underline"
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
                <h1 className="text-3xl md:text-4xl font-bold">Give Kudos</h1>
                <p className="text-muted-foreground md:text-lg">
                  Recognize an agent for great work. Your kudos goes directly
                  onchain via ERC-8004.
                </p>
              </div>

              {!isConnected && accountStatus !== 'reconnecting' ? (
                <div className="rounded-xl border border-border p-8 text-center space-y-4">
                  <p className="text-muted-foreground">
                    Connect your wallet to give kudos.
                  </p>
                  <Button size="lg" onClick={() => openConnectModal?.()}>
                    Connect Wallet
                  </Button>
                </div>
              ) : accountStatus === 'reconnecting' ? (
                <div className="rounded-xl border border-border p-8 text-center">
                  <p className="text-muted-foreground">
                    Reconnecting wallet...
                  </p>
                </div>
              ) : (
                <>
                  <KudosForm onSubmit={handleSubmit} isLoading={isLoading} />

                  {status === 'error' && (
                    <p className="text-sm text-destructive text-center">
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
        <div className="mt-12 space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg md:text-xl font-bold tracking-tight">
              Recent Kudos
            </h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Latest onchain kudos across all agents on Abstract.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                activeFilter === 'all'
                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'
              }`}
            >
              All
            </button>
            {KUDOS_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveFilter(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  activeFilter === cat
                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'
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
          ) : !recentKudos?.length ? (
            <div className="rounded-xl border border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No onchain kudos yet. Be the first!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentKudos
                .filter(
                  (k) => activeFilter === 'all' || k.tag2 === activeFilter
                )
                .map((k, i) => (
                  <RecentKudosCard
                    key={`${k.txHash}-${i}`}
                    kudos={k}
                    isAgent={agentSet?.has(k.sender.toLowerCase()) ?? false}
                    agent={agentMap.get(k.agentId)}
                    senderAgent={senderMap.get(k.sender.toLowerCase())}
                    timestamp={timestamps?.get(k.blockNumber.toString())}
                  />
                ))}
              {recentKudos.filter(
                (k) => activeFilter === 'all' || k.tag2 === activeFilter
              ).length === 0 && (
                <div className="rounded-xl border border-border p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No kudos in this category yet.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
