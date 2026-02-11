'use client';

import { useKudosReceived, type KudosEvent } from '@/hooks/useKudosReceived';
import { CategoryBadge } from '@/components/category-badge';
import { KUDOS_CATEGORIES, type KudosCategory } from '@/config/contract';

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function KudosCard({ kudos }: { kudos: KudosEvent }) {
  const isValidCategory = KUDOS_CATEGORIES.includes(
    kudos.tag2 as KudosCategory
  );

  return (
    <div className="border border-neutral-800 rounded-lg p-4 bg-neutral-900/50 hover:border-[#00DE73]/40 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <a
          href={`https://abscan.org/address/${kudos.sender}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-sm text-neutral-400 hover:text-[#00DE73] transition-colors"
        >
          {truncateAddress(kudos.sender)}
        </a>
        {isValidCategory ? (
          <CategoryBadge category={kudos.tag2 as KudosCategory} />
        ) : (
          <span className="text-xs text-neutral-500">{kudos.tag2}</span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-neutral-500 mt-2">
        <span>Block #{kudos.blockNumber.toString()}</span>
        <a
          href={`https://abscan.org/tx/${kudos.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#00DE73] transition-colors"
        >
          View tx ↗
        </a>
      </div>
    </div>
  );
}

export function KudosFeed({ agentId }: { agentId: number }) {
  const { data: kudos, isLoading, error } = useKudosReceived(agentId);

  if (isLoading) {
    return (
      <div className="text-neutral-500 text-sm animate-pulse">
        Loading onchain kudos...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-400 text-sm">Failed to load kudos</div>
    );
  }

  if (!kudos?.length) {
    return (
      <div className="text-neutral-500 text-sm">
        No onchain kudos yet — be the first!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-[#00DE73]">
        Onchain Kudos ({kudos.length})
      </h3>
      {kudos.map((k, i) => (
        <KudosCard key={`${k.txHash}-${i}`} kudos={k} />
      ))}
    </div>
  );
}
