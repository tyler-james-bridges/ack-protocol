'use client';

import { useKudosReceived, type KudosEvent } from '@/hooks/useKudosReceived';
import { CategoryBadge } from '@/components/category-badge';
import { KUDOS_CATEGORIES, type KudosCategory } from '@/config/contract';

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function parseMessage(feedbackURI: string): string | null {
  try {
    // ERC-8004 best practices: data:application/json;base64,<base64 JSON>
    if (feedbackURI.startsWith('data:application/json;base64,')) {
      const json = decodeURIComponent(
        escape(atob(feedbackURI.replace('data:application/json;base64,', '')))
      );
      const payload = JSON.parse(json);
      return payload.reasoning || payload.message || null;
    }
    // Legacy format: data:,<url-encoded content>
    if (feedbackURI.startsWith('data:,')) {
      const decoded = decodeURIComponent(feedbackURI.slice(6));
      // If it's JSON, extract the message field
      try {
        const payload = JSON.parse(decoded);
        return payload.reasoning || payload.message || null;
      } catch {
        // Plain text message
        return decoded || null;
      }
    }
  } catch {
    // ignore malformed URIs
  }
  return null;
}

function KudosCard({ kudos }: { kudos: KudosEvent }) {
  const isValidCategory = KUDOS_CATEGORIES.includes(
    kudos.tag2 as KudosCategory
  );
  const message = parseMessage(kudos.feedbackURI);

  return (
    <div className="border border-border rounded-lg p-4 bg-muted/50 hover:border-[#00DE73]/40 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-muted-foreground">
          <span className="text-foreground/60">from</span>{' '}
          <a
            href={`https://abscan.org/address/${kudos.sender}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono hover:text-[#00DE73] transition-colors"
          >
            {truncateAddress(kudos.sender)}
          </a>
        </p>
        {isValidCategory ? (
          <CategoryBadge category={kudos.tag2 as KudosCategory} />
        ) : (
          <span className="text-xs text-muted-foreground">{kudos.tag2}</span>
        )}
      </div>

      {message && (
        <p className="text-sm text-foreground my-2">&ldquo;{message}&rdquo;</p>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
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
      <div className="text-muted-foreground text-sm animate-pulse">
        Loading onchain kudos...
      </div>
    );
  }

  if (error) {
    return <div className="text-red-400 text-sm">Failed to load kudos</div>;
  }

  if (!kudos?.length) {
    return (
      <div id="kudos-feed" className="text-muted-foreground text-sm">
        No onchain kudos yet - be the first!
      </div>
    );
  }

  return (
    <div id="kudos-feed" className="space-y-3">
      <h3 className="text-sm font-medium text-[#00DE73]">
        Onchain Kudos ({kudos.length})
      </h3>
      {kudos.map((k, i) => (
        <KudosCard key={`${k.txHash}-${i}`} kudos={k} />
      ))}
    </div>
  );
}
