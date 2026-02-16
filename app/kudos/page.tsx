'use client';

import { useLoginWithAbstract } from '@abstract-foundation/agw-react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Nav } from '@/components/nav';
import { KudosForm } from '@/components/kudos-form';
import { CategoryBadge } from '@/components/category-badge';
import { KUDOS_CATEGORIES, type KudosCategory } from '@/config/contract';
import { useGiveKudos, useRecentKudos, useIsAgent, useLeaderboard } from '@/hooks';
import type { RecentKudos } from '@/hooks';
import type { ScanAgent } from '@/lib/api';
import { AgentAvatar } from '@/components/agent-avatar';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function SenderBadge({ isAgent }: { isAgent: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none shrink-0 ${
        isAgent
          ? 'bg-[#00DE73]/10 text-[#00DE73] border border-[#00DE73]/20'
          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
      }`}
    >
      {isAgent ? 'Agent' : 'Human'}
    </span>
  );
}

function RecentKudosCard({
  kudos,
  isAgent,
  agent,
  senderAgent,
}: {
  kudos: RecentKudos;
  isAgent: boolean;
  agent?: ScanAgent;
  senderAgent?: ScanAgent;
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
    <div className="flex gap-3 border border-border rounded-lg p-4 bg-card hover:border-[#00DE73]/40 transition-colors">
      <Link href={senderLink} className="shrink-0 mt-0.5">
        <AgentAvatar
          name={senderName}
          imageUrl={senderAgent?.image_url}
          size={36}
        />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <Link
              href={senderLink}
              className={`text-sm hover:text-[#00DE73] transition-colors shrink-0 ${senderAgent ? 'font-semibold text-foreground' : 'font-mono text-muted-foreground'}`}
            >
              {senderName}
            </Link>
            <SenderBadge isAgent={isAgent} />
            <span className="text-muted-foreground/40 text-xs shrink-0">to</span>
            <Link
              href={`/agent/2741/${kudos.agentId}`}
              className="text-sm font-semibold text-foreground hover:text-[#00DE73] transition-colors truncate"
            >
              {receiverName}
            </Link>
          </div>
          {isValidCategory && (
            <CategoryBadge category={kudos.tag2 as KudosCategory} />
          )}
        </div>

        {kudos.message && (
          <p className="text-sm text-foreground/80 my-1.5">
            &ldquo;{kudos.message}&rdquo;
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
          <span>Block #{kudos.blockNumber.toString()}</span>
          <a
            href={`https://abscan.org/tx/${kudos.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#00DE73] transition-colors"
          >
            View tx
          </a>
        </div>
      </div>
    </div>
  );
}

export default function GiveKudosPage() {
  const { login } = useLoginWithAbstract();
  const { address, isConnected } = useAccount();
  const { giveKudos, status, txHash, reset, isLoading } = useGiveKudos();
  const { data: recentKudos, isLoading: loadingFeed } = useRecentKudos();
  const senders = recentKudos?.map((k) => k.sender) || [];
  const { data: agentSet } = useIsAgent(senders);
  const { data: agents } = useLeaderboard({ limit: 50, chainId: 2741, sortBy: 'total_score' });

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
    agent: { token_id: string };
    category: string;
    message: string;
  }) => {
    if (!address) return;
    giveKudos({
      agentId: Number(data.agent.token_id),
      category: data.category as Parameters<typeof giveKudos>[0]['category'],
      message: data.message,
      clientAddress: address,
    });
  };

  return (
    <div className="min-h-screen">
      <Nav />

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
                  href={`https://abscan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
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

              {!isConnected ? (
                <div className="rounded-xl border border-border p-8 text-center space-y-4">
                  <p className="text-muted-foreground">
                    Connect your wallet to give kudos.
                  </p>
                  <Button size="lg" onClick={() => login()}>
                    Connect with Abstract
                  </Button>
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
              {recentKudos.map((k, i) => (
                <RecentKudosCard
                  key={`${k.txHash}-${i}`}
                  kudos={k}
                  isAgent={agentSet?.has(k.sender.toLowerCase()) ?? false}
                  agent={agentMap.get(k.agentId)}
                  senderAgent={senderMap.get(k.sender.toLowerCase())}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
