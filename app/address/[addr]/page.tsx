'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Nav } from '@/components/nav';
import { AgentAvatar } from '@/components/agent-avatar';
import { CategoryBadge } from '@/components/category-badge';
import { KUDOS_CATEGORIES, type KudosCategory } from '@/config/contract';
import { fetchAgents, type ScanAgent } from '@/lib/api';
import { useKudosGiven } from '@/hooks';

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function AddressPage() {
  const { addr } = useParams<{ addr: string }>();
  const address = addr as `0x${string}`;

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

  const { data: kudosGiven, isLoading: loadingGiven } = useKudosGiven(address);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="mx-auto max-w-2xl px-4 pt-10 pb-24">
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-1">
            Address
          </p>
          <h1 className="text-lg md:text-xl font-bold tracking-tight font-mono">
            {truncateAddress(address)}
          </h1>
          <a
            href={`https://abscan.org/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-[#00DE73] transition-colors"
          >
            View on Abscan
          </a>
        </div>

        {/* Agent Card (if this address owns one) */}
        {loadingAgent ? (
          <section className="rounded-2xl border border-border bg-card p-6 mb-5">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 animate-pulse rounded-xl bg-muted" />
              <div className="space-y-2 flex-1">
                <div className="h-5 w-40 animate-pulse rounded bg-muted" />
                <div className="h-3 w-28 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </section>
        ) : agent ? (
          <section className="rounded-2xl border border-border bg-card p-6 mb-5">
            <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
              Registered Agent
            </h2>
            <div className="flex items-center gap-4">
              <div className="rounded-xl overflow-hidden ring-2 ring-border ring-offset-2 ring-offset-background">
                <AgentAvatar
                  name={agent.name}
                  imageUrl={agent.image_url}
                  size={56}
                />
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold tracking-tight">{agent.name}</p>
                <p className="text-xs text-muted-foreground">
                  #{agent.token_id} · Score: {agent.total_score.toFixed(1)}
                </p>
              </div>
            </div>
            {agent.description && (
              <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
                {agent.description}
              </p>
            )}
            <Link
              href={`/agent/${agent.chain_id}/${agent.token_id}`}
              className="inline-flex items-center gap-1.5 text-sm text-[#00DE73] hover:text-[#00DE73]/80 transition-colors font-medium mt-4"
            >
              View agent page →
            </Link>
          </section>
        ) : (
          <section className="rounded-2xl border border-border bg-card p-6 mb-5">
            <p className="text-sm text-muted-foreground">
              No registered agent found for this address.
            </p>
          </section>
        )}

        {/* Kudos Given */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            Kudos Given
            {kudosGiven && kudosGiven.length > 0 && (
              <span className="ml-2 text-[#00DE73]">({kudosGiven.length})</span>
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
            <p className="text-sm text-muted-foreground text-center py-6">
              No kudos given yet.
            </p>
          ) : (
            <div className="space-y-3">
              {kudosGiven.map((k, i) => {
                const isValidCategory = KUDOS_CATEGORIES.includes(
                  k.tag2 as KudosCategory
                );
                return (
                  <div
                    key={`${k.txHash}-${i}`}
                    className="border border-border rounded-lg p-4 bg-muted/50 hover:border-[#00DE73]/40 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Link
                        href={`/agent/2741/${k.agentId}`}
                        className="text-sm font-medium text-foreground hover:text-[#00DE73] transition-colors"
                      >
                        Agent #{k.agentId}
                      </Link>
                      {isValidCategory && (
                        <CategoryBadge category={k.tag2 as KudosCategory} />
                      )}
                    </div>
                    {k.message && (
                      <p className="text-sm text-foreground my-2">
                        &ldquo;{k.message}&rdquo;
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                      <span>Block #{k.blockNumber.toString()}</span>
                      <a
                        href={`https://abscan.org/tx/${k.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#00DE73] transition-colors"
                      >
                        View tx
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
