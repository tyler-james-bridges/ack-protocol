'use client';

import { useState, useEffect } from 'react';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Nav } from '@/components/nav';
import { Button } from '@/components/ui/button';
import { AgentAvatar } from '@/components/agent-avatar';
import { ChainIcon } from '@/components/chain-icon';
import { IDENTITY_REGISTRY_ABI } from '@/config/abi';
import { IDENTITY_REGISTRY_ADDRESS } from '@/config/contract';
import { chain } from '@/config/chain';
import { fetchAgents, type ScanAgent } from '@/lib/api';
import { getChainName, useKudosGiven } from '@/hooks';
import { useKudosReceived } from '@/hooks/useKudosReceived';
import { CategoryBadge } from '@/components/category-badge';
import { KUDOS_CATEGORIES, type KudosCategory } from '@/config/contract';

const BALANCE_OF_ABI = [
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export default function ProfilePage() {
  const { address, isConnected, chain: connectedChain } = useAccount();
  const { openConnectModal } = useConnectModal();

  // Check if wallet owns an agent
  const { data: balance } = useReadContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: BALANCE_OF_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: chain.id,
    query: { enabled: !!address },
  });

  const hasAgent = balance ? Number(balance) > 0 : false;

  // Load pending agent data from registration for preview
  const [pendingAgent, setPendingAgent] = useState<{
    name: string;
    description: string;
  } | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('ack-pending-agent');
      if (raw) setPendingAgent(JSON.parse(raw));
    } catch {}
  }, []);

  // (clear pending moved below myAgent declaration)

  // Find agent on 8004scan by owner address
  const { data: myAgent, isLoading: loadingAgent } = useQuery({
    queryKey: ['my-agent', address],
    queryFn: async (): Promise<ScanAgent | null> => {
      if (!address) return null;
      const result = await fetchAgents({ search: address, limit: 50 });
      const match = result.items.find(
        (a) =>
          a.owner_address.toLowerCase() === address.toLowerCase() ||
          a.creator_address.toLowerCase() === address.toLowerCase()
      );
      return match || null;
    },
    enabled: !!address && hasAgent,
    staleTime: 60_000,
  });

  // Clear pending data once agent is indexed
  useEffect(() => {
    if (myAgent) {
      localStorage.removeItem('ack-pending-agent');
      setPendingAgent(null);
    }
  }, [myAgent]);

  // Kudos given by this wallet
  const { data: kudosGiven, isLoading: loadingGiven } = useKudosGiven(
    address as `0x${string}` | undefined
  );

  // Kudos received by this wallet's agent
  const { data: kudosReceived, isLoading: loadingReceived } = useKudosReceived(
    myAgent ? Number(myAgent.token_id) : undefined
  );

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Nav />
        <main className="mx-auto max-w-lg px-4 pt-24 pb-24 text-center">
          <div className="rounded-2xl border border-border bg-card p-10">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted border border-border">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-7 w-7 text-muted-foreground"
              >
                <path
                  d="M15.75 5.25a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
              Connect Wallet
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mb-8 max-w-xs mx-auto">
              Connect your Abstract Global Wallet to view your agent profile and
              reputation.
            </p>
            <Button size="lg" onClick={() => openConnectModal?.()} className="px-8">
              Connect Wallet
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="mx-auto max-w-2xl px-4 pt-10 pb-24">
        {/* Page Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-1">
            Profile
          </p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Your Account
          </h1>
        </div>

        {/* Wallet Card */}
        <section className="rounded-2xl border border-border bg-card p-5 mb-5">
          <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            Wallet
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Address</span>
              <span className="text-sm font-mono text-foreground bg-muted rounded-md px-2 py-0.5 border border-border">
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Network</span>
              <span className="text-sm text-foreground">
                {connectedChain ? connectedChain.name : 'Unknown'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Agent Status
              </span>
              {hasAgent ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <span className="h-2 w-2 rounded-full bg-foreground animate-pulse" />
                  Registered
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Not registered
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Agent Details or Register CTA */}
        {hasAgent ? (
          <>
            {/* Agent Card */}
            <section className="rounded-2xl border border-border bg-card p-6 mb-5 relative overflow-hidden">
              <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-5 relative">
                Your Agent
              </h2>

              {loadingAgent ? (
                <div className="space-y-4 relative">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 animate-pulse rounded-xl bg-muted" />
                    <div className="space-y-2 flex-1">
                      <div className="h-5 w-40 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-28 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                </div>
              ) : myAgent ? (
                <div className="space-y-5 relative">
                  {/* Agent identity */}
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl overflow-hidden ring-2 ring-border ring-offset-2 ring-offset-background">
                      <AgentAvatar
                        name={myAgent.name}
                        imageUrl={myAgent.image_url}
                        size={56}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-bold tracking-tight">
                          {myAgent.name}
                        </p>
                        <ChainIcon chainId={myAgent.chain_id} size={16} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Token #{myAgent.token_id} on{' '}
                        {getChainName(myAgent.chain_id)}
                      </p>
                    </div>
                  </div>

                  {myAgent.description && (
                    <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                      {myAgent.description}
                    </p>
                  )}

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <StatBlock
                      label="Total Score"
                      value={myAgent.total_score.toFixed(1)}
                      accent
                    />
                    <StatBlock
                      label="Feedbacks"
                      value={String(myAgent.total_feedbacks)}
                    />
                    <StatBlock
                      label="Avg Score"
                      value={myAgent.average_score.toFixed(1)}
                    />
                  </div>

                  <Link
                    href={`/agent/${myAgent.chain_id}/${myAgent.token_id}`}
                    className="inline-flex items-center gap-1.5 text-sm text-[#00DE73] hover:text-[#00DE73]/80 transition-colors font-medium"
                  >
                    View agent page
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </Link>
                </div>
              ) : (
                <div className="relative space-y-4">
                  {pendingAgent ? (
                    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 animate-pulse">
                      <p className="text-sm font-medium">{pendingAgent.name}</p>
                      {pendingAgent.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {pendingAgent.description}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 animate-pulse rounded-xl bg-muted" />
                      <div className="space-y-2 flex-1">
                        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
                        <div className="h-3 w-28 animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Registered onchain -- waiting for indexer.
                    </p>
                    <p className="text-xs text-muted-foreground/50 mt-1">
                      This usually takes a few minutes.
                    </p>
                    <a
                      href="https://www.8004scan.io/agents/abstract"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 text-xs text-primary hover:underline"
                    >
                      View all Abstract agents on 8004scan
                    </a>
                  </div>
                </div>
              )}
            </section>

            {/* Update Agent URI */}
            <UpdateAgentURI agent={myAgent} />

            {/* Kudos Received */}
            {myAgent && (
              <section className="rounded-2xl border border-border bg-card p-6 mb-5">
                <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                  Kudos Received
                  {kudosReceived && kudosReceived.length > 0 && (
                    <span className="ml-2 text-[#00DE73]">
                      ({kudosReceived.length})
                    </span>
                  )}
                </h2>
                {loadingReceived ? (
                  <div className="space-y-3">
                    {[...Array(2)].map((_, i) => (
                      <div
                        key={i}
                        className="border border-border rounded-lg p-4 animate-pulse"
                      >
                        <div className="h-4 bg-muted rounded w-2/3 mb-3" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : !kudosReceived?.length ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground">
                      No kudos received yet.
                    </p>
                    <p className="text-xs text-muted-foreground/50 mt-1">
                      Share your agent page to start collecting reputation.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {kudosReceived.map((k, i) => (
                      <KudosCard
                        key={`recv-${k.txHash}-${i}`}
                        sender={k.sender}
                        agentId={null}
                        tag2={k.tag2}
                        message={parseMessage(k.feedbackURI)}
                        txHash={k.txHash}
                        blockNumber={k.blockNumber}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Kudos Given */}
            <section className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                Kudos Given
                {kudosGiven && kudosGiven.length > 0 && (
                  <span className="ml-2 text-[#00DE73]">
                    ({kudosGiven.length})
                  </span>
                )}
              </h2>
              {loadingGiven ? (
                <div className="space-y-3">
                  {[...Array(2)].map((_, i) => (
                    <div
                      key={i}
                      className="border border-border rounded-lg p-4 animate-pulse"
                    >
                      <div className="h-4 bg-muted rounded w-2/3 mb-3" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : !kudosGiven?.length ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">
                    No kudos given yet.
                  </p>
                  <Link
                    href="/leaderboard"
                    className="inline-flex items-center gap-1 mt-3 text-sm text-[#00DE73] hover:text-[#00DE73]/80 transition-colors font-medium"
                  >
                    Browse agents to review
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {kudosGiven.map((k, i) => (
                    <KudosCard
                      key={`given-${k.txHash}-${i}`}
                      sender={null}
                      agentId={k.agentId}
                      tag2={k.tag2}
                      message={k.message}
                      txHash={k.txHash}
                      blockNumber={k.blockNumber}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="rounded-2xl border border-border bg-card p-10 text-center">
            <div>
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted border border-border">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-7 w-7 text-muted-foreground"
                >
                  <path
                    d="M12 4.5v15m7.5-7.5h-15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-2">
                No Agent Registered
              </h2>
              <p className="text-sm md:text-base text-muted-foreground mb-6 max-w-sm mx-auto">
                Register your AI agent on the ERC-8004 Identity Registry to
                start building onchain reputation.
              </p>
              <Link href="/register">
                <Button size="lg" className="px-8">
                  Register Agent
                </Button>
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function StatBlock({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 text-center transition-colors ${
        accent ? 'border-border bg-muted/50' : 'border-border bg-muted/50'
      }`}
    >
      <p className="text-xl md:text-2xl font-bold tabular-nums tracking-tight">
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
        {label}
      </p>
    </div>
  );
}

function UpdateAgentURI({ agent }: { agent: ScanAgent | null | undefined }) {
  const [newURI, setNewURI] = useState('');
  const [expanded, setExpanded] = useState(false);
  const { writeContract, data: txHash } = useWriteContract();
  const { isSuccess: txConfirmed, isLoading: txPending } =
    useWaitForTransactionReceipt({ hash: txHash, chainId: chain.id });

  if (!agent) return null;

  function handleSubmit() {
    if (!newURI.trim() || !agent) return;
    writeContract({
      address: IDENTITY_REGISTRY_ADDRESS,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'setAgentURI',
      args: [BigInt(agent.token_id), newURI.trim()],
      chainId: chain.id,
    });
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6 mb-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          Settings
        </h2>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-[#00DE73] hover:text-[#00DE73]/80 transition-colors font-medium"
        >
          {expanded ? 'Collapse' : 'Update Agent URI'}
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-2 font-medium">
              New Agent URI
            </label>
            <input
              type="text"
              value={newURI}
              onChange={(e) => setNewURI(e.target.value)}
              placeholder="data:application/json;base64,... or https://..."
              disabled={txPending}
              className="w-full rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-sm md:text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-[#00DE73]/30 focus:border-[#00DE73]/30 disabled:opacity-50 transition-all"
            />
          </div>
          {txConfirmed && (
            <div className="flex items-center gap-2 text-sm text-[#00DE73] bg-[#00DE73]/5 rounded-lg px-3 py-2 border border-[#00DE73]/20">
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4 shrink-0"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
              Agent URI updated successfully.
            </div>
          )}
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!newURI.trim() || txPending}
          >
            {txPending ? 'Confirming...' : 'Update URI'}
          </Button>
        </div>
      )}
    </section>
  );
}

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function parseMessage(feedbackURI: string): string | null {
  try {
    if (feedbackURI.startsWith('data:application/json;base64,')) {
      const json = decodeURIComponent(
        escape(atob(feedbackURI.replace('data:application/json;base64,', '')))
      );
      const payload = JSON.parse(json);
      return payload.reasoning || payload.message || null;
    }
    if (feedbackURI.startsWith('data:,')) {
      return decodeURIComponent(feedbackURI.slice(6)) || null;
    }
  } catch {
    // ignore malformed URIs
  }
  return null;
}

function KudosCard({
  sender,
  agentId,
  tag2,
  message,
  txHash,
  blockNumber,
}: {
  sender: string | null;
  agentId: number | null;
  tag2: string;
  message: string | null;
  txHash: string;
  blockNumber: bigint;
}) {
  const isValidCategory = KUDOS_CATEGORIES.includes(tag2 as KudosCategory);

  return (
    <div className="border border-border rounded-lg p-4 bg-muted/50 hover:border-[#00DE73]/40 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {sender && (
            <a
              href={`https://abscan.org/address/${sender}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm text-muted-foreground hover:text-[#00DE73] transition-colors"
            >
              {truncateAddress(sender)}
            </a>
          )}
          {agentId !== null && (
            <Link
              href={`/agent/2741/${agentId}`}
              className="text-sm font-medium text-foreground hover:text-[#00DE73] transition-colors"
            >
              Agent #{agentId}
            </Link>
          )}
        </div>
        {isValidCategory && <CategoryBadge category={tag2 as KudosCategory} />}
      </div>

      {message && (
        <p className="text-sm text-foreground my-2">&ldquo;{message}&rdquo;</p>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
        <span>Block #{blockNumber.toString()}</span>
        <a
          href={`https://abscan.org/tx/${txHash}`}
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
