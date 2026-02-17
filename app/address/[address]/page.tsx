'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Nav } from '@/components/nav';
import { AgentAvatar } from '@/components/agent-avatar';
import { CategoryBadge } from '@/components/category-badge';
import {
  KUDOS_CATEGORIES,
  CATEGORY_META,
  type KudosCategory,
} from '@/config/contract';
import { useKudosGiven } from '@/hooks';
import type { KudosGivenEvent } from '@/hooks';
import { fetchAgents, type ScanAgent } from '@/lib/api';
import {
  useBlockTimestamps,
  formatRelativeTime,
} from '@/hooks/useBlockTimestamps';
import { createPublicClient, http, formatEther } from 'viem';
import { abstract } from 'viem/chains';
import { IDENTITY_REGISTRY_ADDRESS } from '@/config/contract';

const abstractClient = createPublicClient({
  chain: abstract,
  transport: http(),
});

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function CopyableAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="group flex items-center gap-1.5 font-mono text-base font-bold text-foreground hover:text-primary transition-colors"
      title={`Click to copy: ${address}`}
    >
      <span>{truncateAddress(address)}</span>
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60 transition-opacity"
      >
        <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
        <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" />
      </svg>
      {copied && (
        <span className="text-xs text-[#00DE73] font-sans">Copied</span>
      )}
    </button>
  );
}

function KudosHistoryCard({
  kudos,
  agent,
  timestamp,
}: {
  kudos: KudosGivenEvent;
  agent?: ScanAgent;
  timestamp?: number;
}) {
  const isValidCategory = KUDOS_CATEGORIES.includes(
    kudos.tag2 as KudosCategory
  );
  const agentName = agent?.name || `Agent #${kudos.agentId}`;

  return (
    <div className="border border-border rounded-lg p-3 sm:p-4 bg-card hover:border-[#00DE73]/40 transition-colors">
      <div className="flex items-center gap-1.5 flex-wrap mb-1">
        <Link href={`/agent/2741/${kudos.agentId}`} className="shrink-0">
          <AgentAvatar name={agentName} imageUrl={agent?.image_url} size={24} />
        </Link>
        <Link
          href={`/agent/2741/${kudos.agentId}`}
          className="text-xs sm:text-sm font-semibold text-foreground hover:text-[#00DE73] transition-colors truncate"
        >
          {agentName}
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
        href={`https://abscan.org/tx/${kudos.txHash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[11px] text-muted-foreground/50 hover:text-[#00DE73] transition-colors"
      >
        {timestamp
          ? formatRelativeTime(timestamp)
          : `Block #${kudos.blockNumber.toString()}`}
      </a>
    </div>
  );
}

export default function UserProfilePage() {
  const { address: rawAddress } = useParams<{ address: string }>();
  const address = rawAddress as `0x${string}`;

  const { data: balance } = useQuery({
    queryKey: ['eth-balance', address],
    queryFn: async () => {
      const bal = await abstractClient.getBalance({ address });
      return formatEther(bal);
    },
    enabled: !!address,
    staleTime: 60_000,
  });

  const { data: agent } = useQuery({
    queryKey: ['address-agent', address],
    queryFn: async (): Promise<ScanAgent | null> => {
      // Check onchain if this address owns an agent on Abstract
      const balanceOfAbi = [
        {
          inputs: [{ name: 'owner', type: 'address' }],
          name: 'balanceOf',
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view' as const,
          type: 'function' as const,
        },
      ] as const;
      const tokenOfOwnerAbi = [
        {
          inputs: [
            { name: 'owner', type: 'address' },
            { name: 'index', type: 'uint256' },
          ],
          name: 'tokenOfOwnerByIndex',
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view' as const,
          type: 'function' as const,
        },
      ] as const;

      try {
        const balance = await abstractClient.readContract({
          address: IDENTITY_REGISTRY_ADDRESS,
          abi: balanceOfAbi,
          functionName: 'balanceOf',
          args: [address],
        });
        if (Number(balance) === 0) return null;

        const tokenId = await abstractClient.readContract({
          address: IDENTITY_REGISTRY_ADDRESS,
          abi: tokenOfOwnerAbi,
          functionName: 'tokenOfOwnerByIndex',
          args: [address, BigInt(0)],
        });

        const result = await fetchAgents({
          chainId: 2741,
          limit: 1,
          search: String(tokenId),
        });
        return (
          result.items.find((a) => String(a.token_id) === String(tokenId)) ||
          null
        );
      } catch {
        return null;
      }
    },
    enabled: !!address,
    staleTime: 120_000,
  });

  const { data: kudosGiven, isLoading: loadingGiven } = useKudosGiven(address);

  const agentIds = [...new Set(kudosGiven?.map((k) => k.agentId) || [])];
  const { data: agentMap } = useQuery({
    queryKey: ['agents-batch', agentIds.join(',')],
    queryFn: async () => {
      const map = new Map<number, ScanAgent>();
      if (agentIds.length === 0) return map;
      const result = await fetchAgents({ limit: 50, chainId: 2741 });
      for (const a of result.items) {
        map.set(Number(a.token_id), a);
      }
      return map;
    },
    enabled: agentIds.length > 0,
    staleTime: 120_000,
  });

  const blockNumbers = kudosGiven?.map((k) => k.blockNumber) || [];
  const { data: timestamps } = useBlockTimestamps(blockNumbers);

  // Compute stats
  const totalKudos = kudosGiven?.length || 0;
  const uniqueAgents = new Set(kudosGiven?.map((k) => k.agentId) || []).size;

  const categoryCounts: Record<string, number> = {};
  let firstBlock: bigint | null = null;
  for (const k of kudosGiven || []) {
    if (KUDOS_CATEGORIES.includes(k.tag2 as KudosCategory)) {
      categoryCounts[k.tag2] = (categoryCounts[k.tag2] || 0) + 1;
    }
    if (firstBlock === null || k.blockNumber < firstBlock) {
      firstBlock = k.blockNumber;
    }
  }

  const mostUsedCategory = Object.entries(categoryCounts).sort(
    (a, b) => b[1] - a[1]
  )[0];

  const firstTimestamp = firstBlock && timestamps?.get(firstBlock.toString());
  const firstKudosDate = firstTimestamp
    ? new Date(firstTimestamp * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : firstBlock
      ? `Block #${firstBlock.toString()}`
      : '--';

  const sortedCategories = KUDOS_CATEGORIES.filter(
    (c) => categoryCounts[c]
  ).sort((a, b) => (categoryCounts[b] || 0) - (categoryCounts[a] || 0));

  return (
    <div className="min-h-screen">
      <Nav />

      <div className="mx-auto max-w-5xl px-4 pt-6 pb-16">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          {/* ================================================================ */}
          {/* LEFT COLUMN - Profile Sidebar                                    */}
          {/* ================================================================ */}
          <aside className="w-full lg:w-80 shrink-0 lg:sticky lg:top-20 space-y-4">
            {/* Profile Card */}
            <div className="gradient-border card-glow rounded-xl p-5 space-y-4">
              {/* Identity header */}
              <div className="flex items-start gap-3.5">
                <div className="rounded-xl overflow-hidden shrink-0 ring-2 ring-primary/20">
                  <AgentAvatar name={address} size={64} />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <CopyableAddress address={address} />
                  <div className="flex items-center gap-2 mt-1.5">
                    {balance !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        {parseFloat(balance).toFixed(4)} ETH
                      </span>
                    )}
                    <a
                      href={`https://abscan.org/address/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <svg
                        className="h-3 w-3"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                        />
                      </svg>
                      Abscan
                    </a>
                  </div>
                </div>
              </div>

              {/* Agent badge if they own one */}
              {agent ? (
                <div className="pt-3 border-t border-border/50">
                  <Link
                    href={`/agent/${agent.chain_id}/${agent.token_id}`}
                    className="inline-flex items-center gap-2 rounded-md bg-muted/50 px-2.5 py-1.5 text-sm text-[#00DE73] hover:bg-muted transition-colors font-medium"
                  >
                    <AgentAvatar
                      name={agent.name}
                      imageUrl={agent.image_url}
                      size={20}
                    />
                    {agent.name} (Agent #{agent.token_id})
                  </Link>
                </div>
              ) : null}

              {/* Stats */}
              <div className="rounded-lg bg-muted/30 border border-border/50 p-4">
                <div className="flex items-center gap-4">
                  <div className="text-center shrink-0">
                    <div className="text-3xl font-bold text-primary leading-none">
                      {totalKudos}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-medium">
                      Kudos
                    </div>
                  </div>

                  <div className="w-px h-10 bg-border/60" />

                  <div className="grid grid-cols-1 gap-y-1.5 flex-1 text-sm">
                    <div>
                      <span className="text-foreground font-semibold">
                        {uniqueAgents}
                      </span>
                      <span className="text-muted-foreground ml-1 text-xs">
                        {uniqueAgents === 1 ? 'agent' : 'agents'} reviewed
                      </span>
                    </div>
                    <div>
                      <span className="text-foreground font-semibold">
                        {mostUsedCategory
                          ? CATEGORY_META[mostUsedCategory[0] as KudosCategory]
                              .label
                          : '--'}
                      </span>
                      <span className="text-muted-foreground ml-1 text-xs">
                        top category
                      </span>
                    </div>
                    <div>
                      <span className="text-foreground font-semibold text-xs">
                        {firstKudosDate}
                      </span>
                      <span className="text-muted-foreground ml-1 text-xs">
                        first kudos
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reputation / Category Breakdown */}
              {sortedCategories.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                    Reputation
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {sortedCategories.map((cat) => (
                      <CategoryBadge
                        key={cat}
                        category={cat}
                        count={categoryCounts[cat]}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Category Progress */}
              {sortedCategories.length > 1 && (
                <div className="space-y-2">
                  {sortedCategories.map((cat) => {
                    const count = categoryCounts[cat] || 0;
                    const pct = Math.round((count / totalKudos) * 100);
                    const meta = CATEGORY_META[cat];
                    return (
                      <div key={cat}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span
                            className="text-xs font-medium"
                            style={{ color: meta.color }}
                          >
                            {meta.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: meta.color,
                              opacity: 0.7,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          {/* ================================================================ */}
          {/* RIGHT COLUMN - Kudos Feed                                        */}
          {/* ================================================================ */}
          <section className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              Kudos Given
              {totalKudos > 0 && (
                <span className="text-[#00DE73] text-xs font-normal">
                  {totalKudos}
                </span>
              )}
            </h2>

            {loadingGiven ? (
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
            ) : !kudosGiven?.length ? (
              <div className="text-center py-12 border border-dashed border-border rounded-xl">
                <p className="text-sm text-muted-foreground">
                  No kudos given yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {kudosGiven.map((k, i) => (
                  <KudosHistoryCard
                    key={`${k.txHash}-${i}`}
                    kudos={k}
                    agent={agentMap?.get(k.agentId)}
                    timestamp={timestamps?.get(k.blockNumber.toString())}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
