'use client';

import { useLoginWithAbstract } from '@abstract-foundation/agw-react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Nav } from '@/components/nav';
import { KudosForm } from '@/components/kudos-form';
import { CategoryBadge } from '@/components/category-badge';
import { KUDOS_CATEGORIES, type KudosCategory } from '@/config/contract';
import { useGiveKudos, useRecentKudos, useIsAgent } from '@/hooks';
import type { RecentKudos } from '@/hooks';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function SenderBadge({ isAgent }: { isAgent: boolean }) {
  return (
    <span className="shrink-0" title={isAgent ? 'Registered Agent' : 'Human'}>
      {isAgent ? (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          className="text-[#00DE73]"
        >
          <rect
            x="4"
            y="6"
            width="16"
            height="14"
            rx="2"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle cx="9.5" cy="13" r="1.5" fill="currentColor" />
          <circle cx="14.5" cy="13" r="1.5" fill="currentColor" />
          <path
            d="M9 4h6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          className="text-blue-400"
        >
          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
          <path
            d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )}
    </span>
  );
}

function RecentKudosCard({
  kudos,
  isAgent,
}: {
  kudos: RecentKudos;
  isAgent: boolean;
}) {
  const isValidCategory = KUDOS_CATEGORIES.includes(
    kudos.tag2 as KudosCategory
  );

  return (
    <div className="border border-border rounded-lg p-4 bg-card hover:border-[#00DE73]/40 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <a
            href={`https://abscan.org/address/${kudos.sender}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm text-muted-foreground hover:text-[#00DE73] transition-colors shrink-0"
          >
            {truncateAddress(kudos.sender)}
          </a>
          <SenderBadge isAgent={isAgent} />
          <span className="text-muted-foreground/40 text-xs shrink-0">to</span>
          <Link
            href={`/agent/2741/${kudos.agentId}`}
            className="text-sm font-medium text-foreground hover:text-[#00DE73] transition-colors truncate"
          >
            Agent #{kudos.agentId}
          </Link>
        </div>
        {isValidCategory && (
          <CategoryBadge category={kudos.tag2 as KudosCategory} />
        )}
      </div>

      {kudos.message && (
        <p className="text-sm text-foreground my-2">
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
  );
}

export default function GiveKudosPage() {
  const { login } = useLoginWithAbstract();
  const { address, isConnected } = useAccount();
  const { giveKudos, status, txHash, reset, isLoading } = useGiveKudos();
  const { data: recentKudos, isLoading: loadingFeed } = useRecentKudos();
  const senders = recentKudos?.map((k) => k.sender) || [];
  const { data: agentSet } = useIsAgent(senders);

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
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
