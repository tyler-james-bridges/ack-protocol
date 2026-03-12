'use client';

import Link from 'next/link';
import { useKudosReceived, type KudosEvent } from '@/hooks/useKudosReceived';
import { useLeaderboard, useIsAgent } from '@/hooks';
import { AgentAvatar } from '@/components/agent-avatar';
import { CategoryBadge } from '@/components/category-badge';
import { KUDOS_CATEGORIES, type KudosCategory } from '@/config/contract';
import { IdentityBadge } from '@/components/identity-badge';
import {
  useBlockTimestamps,
  formatRelativeTime,
} from '@/hooks/useBlockTimestamps';
import type { ScanAgent } from '@/lib/api';

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function parseFeedbackContext(feedbackURI: string): {
  message: string | null;
  sourceFrom: string | null;
} {
  try {
    if (feedbackURI.startsWith('data:application/json;base64,')) {
      const json = decodeURIComponent(
        escape(atob(feedbackURI.replace('data:application/json;base64,', '')))
      );
      const payload = JSON.parse(json);
      return {
        message: payload.reasoning || payload.message || null,
        sourceFrom: payload.from || null,
      };
    }
    if (feedbackURI.startsWith('data:,')) {
      const decoded = decodeURIComponent(feedbackURI.slice(6));
      try {
        const payload = JSON.parse(decoded);
        return {
          message: payload.reasoning || payload.message || null,
          sourceFrom: payload.from || null,
        };
      } catch {
        return { message: decoded || null, sourceFrom: null };
      }
    }
  } catch {
    // ignore malformed URIs
  }
  return { message: null, sourceFrom: null };
}

function TipBadge({ amountUsd }: { amountUsd: number }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#00FF94]/10 text-[#00FF94] text-[10px] font-semibold px-1.5 py-0.5 tabular-nums">
      ${amountUsd.toFixed(amountUsd < 1 ? 2 : 0)}
    </span>
  );
}

function KudosCard({
  kudos,
  agentId,
  receiverAgent,
  senderAgent,
  timestamp,
  isSenderAgent,
  tipAmountUsd,
}: {
  kudos: KudosEvent;
  agentId: number;
  receiverAgent?: ScanAgent;
  senderAgent?: ScanAgent;
  timestamp?: number;
  isSenderAgent: boolean;
  tipAmountUsd?: number;
}) {
  const isValidCategory = KUDOS_CATEGORIES.includes(
    kudos.tag2 as KudosCategory
  );
  const { message, sourceFrom } = parseFeedbackContext(kudos.feedbackURI);

  const twitterHandle = sourceFrom?.startsWith('twitter:@')
    ? sourceFrom.replace('twitter:@', '')
    : null;
  const senderName = senderAgent?.name
    ? senderAgent.name
    : twitterHandle
      ? `@${twitterHandle}`
      : truncateAddress(kudos.sender);
  const receiverName = receiverAgent?.name || `Agent #${agentId}`;
  const senderLink = senderAgent
    ? `/agent/${senderAgent.chain_id}/${senderAgent.token_id}`
    : twitterHandle
      ? `https://x.com/${twitterHandle}`
      : `/address/${kudos.sender}`;

  return (
    <div className="flex gap-3 border border-border rounded-lg p-4 bg-muted/50 hover:border-[#00DE73]/40 transition-colors">
      {/* Sender avatar */}
      {twitterHandle && !senderAgent ? (
        <a
          href={senderLink}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 mt-0.5"
        >
          <AgentAvatar name={senderName} imageUrl={undefined} size={36} />
        </a>
      ) : (
        <Link href={senderLink} className="shrink-0 mt-0.5">
          <AgentAvatar
            name={senderName}
            imageUrl={senderAgent?.image_url}
            size={36}
          />
        </Link>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap text-xs text-muted-foreground">
            {twitterHandle && !senderAgent ? (
              <a
                href={senderLink}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#00DE73] transition-colors font-semibold text-foreground"
              >
                {senderName}
              </a>
            ) : (
              <Link
                href={senderLink}
                className={`hover:text-[#00DE73] transition-colors ${senderAgent ? 'font-semibold text-foreground' : 'font-mono'}`}
              >
                {senderName}
              </Link>
            )}
            <IdentityBadge
              type={
                twitterHandle && !senderAgent
                  ? 'human'
                  : isSenderAgent
                    ? 'agent'
                    : 'human'
              }
            />
            <span>gave</span>
            <Link href={`/agent/2741/${agentId}`} className="shrink-0">
              <AgentAvatar
                name={receiverName}
                imageUrl={receiverAgent?.image_url}
                size={36}
              />
            </Link>
            <Link
              href={`/agent/2741/${agentId}`}
              className="font-semibold text-foreground hover:text-[#00DE73] transition-colors"
            >
              {receiverName}
            </Link>
            <span>kudos</span>
            {isValidCategory && (
              <>
                <span>for</span>
                <CategoryBadge category={kudos.tag2 as KudosCategory} />
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
            {tipAmountUsd !== undefined && tipAmountUsd > 0 && (
              <TipBadge amountUsd={tipAmountUsd} />
            )}
            <a
              href={`https://abscan.org/tx/${kudos.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-muted-foreground/50 hover:text-[#00DE73] transition-colors"
              title="View transaction on Abscan"
            >
              {timestamp ? formatRelativeTime(timestamp) : 'tx'} ↗
            </a>
          </div>
        </div>

        {twitterHandle && !senderAgent && (
          <p className="text-[11px] text-muted-foreground/60 mt-1">
            Submitted via ACK relay, attributed to {senderName}
          </p>
        )}

        {message && (
          <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2 leading-relaxed">
            &ldquo;{message}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}

export function KudosFeed({ agentId }: { agentId: number }) {
  const { data: kudos, isLoading, error } = useKudosReceived(agentId);
  const { data: agents } = useLeaderboard({
    limit: 50,
    chainId: 2741,
    sortBy: 'total_score',
  });

  const blockNumbers = kudos?.map((k) => k.blockNumber) || [];
  const senders = kudos?.map((k) => k.sender) || [];
  const { data: timestamps } = useBlockTimestamps(blockNumbers);
  const { data: agentSet } = useIsAgent(senders);

  // Build lookups
  const agentMap = new Map<number, ScanAgent>();
  const senderMap = new Map<string, ScanAgent>();
  if (agents) {
    for (const a of agents) {
      agentMap.set(Number(a.token_id), a);
      if (a.owner_address) senderMap.set(a.owner_address.toLowerCase(), a);
      if (a.agent_wallet) senderMap.set(a.agent_wallet.toLowerCase(), a);
    }
  }

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
      {[...kudos]
        .sort((a, b) => (a.blockNumber > b.blockNumber ? -1 : 1))
        .map((k, i) => (
          <KudosCard
            key={`${k.txHash}-${i}`}
            kudos={k}
            agentId={agentId}
            receiverAgent={agentMap.get(agentId)}
            senderAgent={senderMap.get(k.sender.toLowerCase())}
            timestamp={timestamps?.get(k.blockNumber.toString())}
            isSenderAgent={
              agentSet?.has(k.sender.toLowerCase()) ??
              !!senderMap.get(k.sender.toLowerCase())
            }
          />
        ))}
    </div>
  );
}
