'use client';

import { useCrossChainRep } from '@/hooks/useCrossChainRep';
import { SUPPORTED_CHAINS } from '@/config/chains';
import { ChainBadgePill } from '@/components/chain-badge-pill';

interface CrossChainRepProps {
  agentAddress: string;
}

const chainOrder = new Map(
  SUPPORTED_CHAINS.map((meta, index) => [meta.chain.id, index])
);

export function CrossChainRep({ agentAddress }: CrossChainRepProps) {
  const { chains, totalFeedbacks, isLoading } = useCrossChainRep(agentAddress);

  const ordered = [...chains].sort((a, b) => {
    if (b.feedbackCount !== a.feedbackCount) {
      return b.feedbackCount - a.feedbackCount;
    }
    return (chainOrder.get(a.chainId) ?? 0) - (chainOrder.get(b.chainId) ?? 0);
  });
  const maxCount = ordered.reduce(
    (max, chain) => Math.max(max, chain.feedbackCount),
    0
  );

  return (
    <section
      className="rounded-xl border border-border bg-card p-4"
      aria-labelledby="cross-chain-rep-title"
    >
      <p className="type-kicker text-muted-foreground">Cross-chain</p>
      <h2 id="cross-chain-rep-title" className="type-heading mt-1">
        Reputation
      </h2>

      {isLoading ? (
        <div className="mt-4 space-y-3" aria-busy="true">
          <div className="h-4 w-40 bg-muted" />
          {[1, 2, 3, 4].map((row) => (
            <div key={row} className="h-8 bg-muted" />
          ))}
        </div>
      ) : ordered.length === 0 ? (
        <p className="type-small mt-3 text-muted-foreground">
          No chain reads completed for this wallet.
        </p>
      ) : (
        <>
          <p className="type-small mt-1 text-muted-foreground">
            {totalFeedbacks} feedback across {ordered.length}{' '}
            {ordered.length === 1 ? 'chain' : 'chains'}
          </p>
          <div className="mt-4 space-y-3">
            {ordered.map((chain) => {
              const width =
                maxCount > 0 ? (chain.feedbackCount / maxCount) * 100 : 0;
              return (
                <div key={chain.chainId} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <ChainBadgePill chainId={chain.chainId} size="sm" />
                    <span className="type-mono text-foreground">
                      {chain.feedbackCount}
                    </span>
                  </div>
                  <div className="h-1 w-full rounded-sm bg-muted">
                    <div
                      className="h-1 rounded-sm bg-primary"
                      style={{
                        width: `${chain.feedbackCount > 0 ? Math.max(width, 4) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
