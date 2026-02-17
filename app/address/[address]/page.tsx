'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Nav } from '@/components/nav';
import { AgentAvatar } from '@/components/agent-avatar';
import { CategoryBadge } from '@/components/category-badge';
import { StatsCard } from '@/components/stats-card';
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
      className="group flex items-center gap-1.5 font-mono text-sm text-muted-foreground hover:text-foreground transition-colors"
      title={address}
    >
      <span className="hidden sm:inline">{address}</span>
      <span className="sm:hidden">{truncateAddress(address)}</span>
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

function CategoryBreakdown({ kudos }: { kudos: KudosGivenEvent[] }) {
  const counts: Record<string, number> = {};
  for (const k of kudos) {
    if (KUDOS_CATEGORIES.includes(k.tag2 as KudosCategory)) {
      counts[k.tag2] = (counts[k.tag2] || 0) + 1;
    }
  }

  const total = Object.values(counts).reduce((s, c) => s + c, 0);
  if (total === 0) return null;

  const sorted = KUDOS_CATEGORIES.filter((c) => counts[c]).sort(
    (a, b) => (counts[b] || 0) - (counts[a] || 0)
  );

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
        Category Breakdown
      </h2>
      <div className="space-y-3">
        {sorted.map((cat) => {
          const count = counts[cat] || 0;
          const pct = Math.round((count / total) * 100);
          const meta = CATEGORY_META[cat];
          return (
            <div key={cat}>
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-sm font-medium"
                  style={{ color: meta.color }}
                >
                  {meta.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {count} ({pct}%)
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
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
    </section>
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

  // ETH balance on Abstract
  const { data: balance } = useQuery({
    queryKey: ['eth-balance', address],
    queryFn: async () => {
      const bal = await abstractClient.getBalance({ address });
      return formatEther(bal);
    },
    enabled: !!address,
    staleTime: 60_000,
  });

  // Check if address owns an agent
  const { data: agent, isLoading: loadingAgent } = useQuery({
    queryKey: ['address-agent', address],
    queryFn: async (): Promise<ScanAgent | null> => {
      const result = await fetchAgents({ search: address, limit: 10 });
      return (
        result.items.find(
          (a) =>
            a.owner_address.toLowerCase() === address.toLowerCase() ||
            a.creator_address.toLowerCase() === address.toLowerCase()
        ) || null
      );
    },
    enabled: !!address,
    staleTime: 120_000,
  });

  // Kudos given
  const { data: kudosGiven, isLoading: loadingGiven } = useKudosGiven(address);

  // Resolve agent names for kudos targets
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

  // Block timestamps
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

  // Get first kudos timestamp
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="mx-auto max-w-2xl px-4 pt-10 pb-24">
        {/* Header */}
        <section className="rounded-2xl border border-border bg-card p-6 mb-5">
          <div className="flex items-center gap-4">
            <div className="rounded-xl overflow-hidden ring-2 ring-border ring-offset-2 ring-offset-background">
              <AgentAvatar name={address} size={56} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-1">
                User Profile
              </p>
              <CopyableAddress address={address} />
              <div className="flex items-center gap-3 mt-1.5">
                {balance !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    {parseFloat(balance).toFixed(4)} ETH
                  </span>
                )}
                <a
                  href={`https://abscan.org/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-[#00DE73] transition-colors"
                >
                  Abscan
                </a>
              </div>
            </div>
          </div>

          {/* Agent badge if they own one */}
          {loadingAgent ? (
            <div className="mt-4 h-8 w-40 animate-pulse rounded bg-muted" />
          ) : agent ? (
            <div className="mt-4 pt-4 border-t border-border">
              <Link
                href={`/agent/${agent.chain_id}/${agent.token_id}`}
                className="inline-flex items-center gap-2 text-sm text-[#00DE73] hover:text-[#00DE73]/80 transition-colors font-medium"
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
        </section>

        {/* Stats */}
        {!loadingGiven && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <StatsCard label="Kudos Given" value={totalKudos} />
            <StatsCard label="Agents Reviewed" value={uniqueAgents} />
            <StatsCard
              label="Top Category"
              value={
                mostUsedCategory
                  ? CATEGORY_META[mostUsedCategory[0] as KudosCategory].label
                  : '--'
              }
            />
            <StatsCard label="First Kudos" value={firstKudosDate} />
          </div>
        )}

        {/* Category Breakdown */}
        {kudosGiven && kudosGiven.length > 0 && (
          <div className="mb-5">
            <CategoryBreakdown kudos={kudosGiven} />
          </div>
        )}

        {/* Kudos Given History */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            Kudos Given
            {totalKudos > 0 && (
              <span className="ml-2 text-[#00DE73]">({totalKudos})</span>
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
            <div className="text-center py-6">
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
      </main>
    </div>
  );
}
