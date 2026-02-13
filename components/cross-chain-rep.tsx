'use client';

import { useCrossChainRep } from '@/hooks/useCrossChainRep';
import { SUPPORTED_CHAINS } from '@/config/chains';
import { ChainBadgePill } from '@/components/chain-badge-pill';

interface CrossChainRepProps {
  agentAddress: string;
}

export function CrossChainRep({ agentAddress }: CrossChainRepProps) {
  const { chains, totalFeedbacks, isLoading } = useCrossChainRep(agentAddress);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-5 space-y-3">
        <div className="h-5 w-52 animate-pulse rounded bg-gray-700" />
        <div className="h-4 w-32 animate-pulse rounded bg-gray-700" />
        <div className="space-y-2 pt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-gray-700" />
          ))}
        </div>
      </div>
    );
  }

  if (chains.length === 0) {
    return (
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-5">
        <h3 className="text-sm md:text-base font-semibold text-gray-300">
          Reputation Across Chains
        </h3>
        <p className="mt-2 text-xs md:text-sm text-gray-500">
          No reputation found on other chains
        </p>
      </div>
    );
  }

  const maxCount = Math.max(...chains.map((c) => c.feedbackCount));

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800 p-5 space-y-4">
      <div>
        <h3 className="text-sm md:text-base font-semibold text-gray-200">
          Reputation Across Chains
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {totalFeedbacks} total feedback{totalFeedbacks !== 1 ? 's' : ''}{' '}
          across {chains.length} chain{chains.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="space-y-2.5">
        {chains.map((c) => {
          const meta = SUPPORTED_CHAINS.find((m) => m.chain.id === c.chainId);
          const color = meta?.color ?? '#888';
          const pct = maxCount > 0 ? (c.feedbackCount / maxCount) * 100 : 0;

          return (
            <div key={c.chainId} className="space-y-1">
              <div className="flex items-center justify-between">
                <ChainBadgePill chainId={c.chainId} size="sm" />
                <span className="text-xs font-medium text-gray-400">
                  {c.feedbackCount}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-700">
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(pct, 4)}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
