'use client';

import { useState } from 'react';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { useLoginWithAbstract } from '@abstract-foundation/agw-react';
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
import { getChainName } from '@/hooks';

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
  const { login } = useLoginWithAbstract();

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

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Nav />
        <main className="mx-auto max-w-lg px-4 pt-24 pb-24 text-center">
          <div className="rounded-2xl border border-neutral-800/60 bg-neutral-950 p-10">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900 border border-neutral-800/60">
              <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-muted-foreground">
                <path d="M15.75 5.25a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">Connect Wallet</h1>
            <p className="text-sm text-muted-foreground mb-8 max-w-xs mx-auto">
              Connect your Abstract Global Wallet to view your agent profile and reputation.
            </p>
            <Button size="lg" onClick={() => login()} className="px-8">
              Connect with Abstract
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
          <p className="text-xs font-semibold tracking-widest text-[#00DE73] uppercase mb-1">
            Profile
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Your Account</h1>
        </div>

        {/* Wallet Card */}
        <section className="rounded-2xl border border-neutral-800/60 bg-neutral-950 p-5 mb-5">
          <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            Wallet
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Address</span>
              <span className="text-sm font-mono text-foreground bg-neutral-900 rounded-md px-2 py-0.5 border border-neutral-800/40">
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
              <span className="text-sm text-muted-foreground">Agent Status</span>
              {hasAgent ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#00DE73]">
                  <span className="h-2 w-2 rounded-full bg-[#00DE73] animate-pulse" />
                  Registered
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">Not registered</span>
              )}
            </div>
          </div>
        </section>

        {/* Agent Details or Register CTA */}
        {hasAgent ? (
          <>
            {/* Agent Card */}
            <section className="rounded-2xl border border-[#00DE73]/15 bg-neutral-950 p-6 mb-5 relative overflow-hidden">
              {/* Subtle glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#00DE73]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

              <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-5 relative">
                Your Agent
              </h2>

              {loadingAgent ? (
                <div className="space-y-4 relative">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 animate-pulse rounded-xl bg-neutral-800" />
                    <div className="space-y-2 flex-1">
                      <div className="h-5 w-40 animate-pulse rounded bg-neutral-800" />
                      <div className="h-3 w-28 animate-pulse rounded bg-neutral-800" />
                    </div>
                  </div>
                </div>
              ) : myAgent ? (
                <div className="space-y-5 relative">
                  {/* Agent identity */}
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl overflow-hidden ring-2 ring-[#00DE73]/20 ring-offset-2 ring-offset-neutral-950">
                      <AgentAvatar
                        name={myAgent.name}
                        imageUrl={myAgent.image_url}
                        size={56}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-bold tracking-tight">{myAgent.name}</p>
                        <ChainIcon chainId={myAgent.chain_id} size={16} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Token #{myAgent.token_id} on {getChainName(myAgent.chain_id)}
                      </p>
                    </div>
                  </div>

                  {myAgent.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
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
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                    </svg>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-6 relative">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 border border-neutral-800/60">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-muted-foreground">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Agent registered onchain but not yet indexed.
                  </p>
                  <p className="text-xs text-muted-foreground/50 mt-1">
                    It may take a few minutes to appear on 8004scan.
                  </p>
                </div>
              )}
            </section>

            {/* Update Agent URI */}
            <UpdateAgentURI agent={myAgent} />

            {/* Kudos History */}
            <section className="rounded-2xl border border-neutral-800/60 bg-neutral-950 p-6">
              <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                Kudos Given
              </h2>
              <div className="text-center py-8">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 border border-neutral-800/60">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-muted-foreground/50">
                    <path d="M3.505 2.365A41.369 41.369 0 019 2c1.863 0 3.697.124 5.495.365 1.247.167 2.18 1.108 2.435 2.268a4.45 4.45 0 00-.577-.069 43.141 43.141 0 00-4.706 0C9.229 4.696 7.5 6.727 7.5 8.998v2.24c0 1.413.67 2.735 1.76 3.562l-2.98 2.98A.75.75 0 015 17.25v-3.443c-.501-.048-1-.106-1.495-.172C2.033 13.438 1 12.162 1 10.72V5.28c0-1.441 1.033-2.717 2.505-2.914z" />
                    <path d="M14 6c-.762 0-1.52.02-2.271.062C10.157 6.148 9 7.472 9 8.998v2.24c0 1.519 1.147 2.839 2.71 2.935.214.013.428.024.642.034.2.009.385.09.518.224l2.35 2.35a.75.75 0 001.28-.531v-2.07c1.453-.195 2.5-1.463 2.5-2.942V8.998c0-1.526-1.157-2.85-2.729-2.936A41.645 41.645 0 0014 6z" />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground">No kudos given yet</p>
                <p className="text-xs text-muted-foreground/50 mt-1">
                  Your kudos history will appear here once indexed.
                </p>
                <Link
                  href="/leaderboard"
                  className="inline-flex items-center gap-1 mt-4 text-sm text-[#00DE73] hover:text-[#00DE73]/80 transition-colors font-medium"
                >
                  Browse agents to review
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            </section>
          </>
        ) : (
          <section className="rounded-2xl border border-[#00DE73]/20 bg-neutral-950 p-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#00DE73]/5 to-transparent pointer-events-none" />
            <div className="relative">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00DE73]/10 border border-[#00DE73]/20">
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-[#00DE73]">
                  <path d="M12 4.5v15m7.5-7.5h-15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 className="text-xl font-bold tracking-tight mb-2">No Agent Registered</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                Register your AI agent on the ERC-8004 Identity Registry to start building onchain reputation.
              </p>
              <Link href="/register">
                <Button size="lg" className="px-8">Register Agent</Button>
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function StatBlock({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 text-center transition-colors ${
      accent
        ? 'border-[#00DE73]/20 bg-[#00DE73]/5'
        : 'border-neutral-800/60 bg-neutral-900/50'
    }`}>
      <p className={`text-xl font-bold tabular-nums tracking-tight ${accent ? 'text-[#00DE73]' : ''}`}>
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
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
    <section className="rounded-2xl border border-neutral-800/60 bg-neutral-950 p-6 mb-5">
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
              className="w-full rounded-xl border border-neutral-800/60 bg-neutral-900/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#00DE73]/30 focus:border-[#00DE73]/30 disabled:opacity-50 transition-all"
            />
          </div>
          {txConfirmed && (
            <div className="flex items-center gap-2 text-sm text-[#00DE73] bg-[#00DE73]/5 rounded-lg px-3 py-2 border border-[#00DE73]/20">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
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
