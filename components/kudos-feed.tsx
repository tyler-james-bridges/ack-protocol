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
import { useTipsForKudos } from '@/hooks/useTipsForKudos';
import { useTipsFeed, type StandaloneTip } from '@/hooks/useTipsFeed';
import { TipCard } from '@/components/tip-card';
import type { ScanAgent } from '@/lib/api';
import {
  DEFAULT_8004_CHAIN_ID,
  getAgentPath,
  getExplorerTxUrl,
} from '@/config/chain';

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

import { TipBadge, TipAttribution } from '@/components/tip-badge';

function KudosCard({
  kudos,
  agentId,
  chainId,
  receiverAgent,
  senderAgent,
  timestamp,
  isSenderAgent,
  tipAmountUsd,
  tipFromAddress,
  tipFromAgent,
}: {
  kudos: KudosEvent;
  agentId: number;
  chainId: number;
  receiverAgent?: ScanAgent;
  senderAgent?: ScanAgent;
  timestamp?: number;
  isSenderAgent: boolean;
  tipAmountUsd?: number;
  tipFromAddress?: string;
  tipFromAgent?: ScanAgent;
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
    <div className="flex gap-3 border border-black/20 rounded-none p-4 bg-black/5/50 hover:border-black transition-colors">
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
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap text-xs text-black/50">
            {twitterHandle && !senderAgent ? (
              <a
                href={senderLink}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-black transition-colors font-semibold text-black"
              >
                {senderName}
              </a>
            ) : (
              <Link
                href={senderLink}
                className={`hover:text-black transition-colors ${senderAgent ? 'font-semibold text-black' : 'font-mono'}`}
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
            <Link href={getAgentPath(agentId, chainId)} className="shrink-0">
              <AgentAvatar
                name={receiverName}
                imageUrl={receiverAgent?.image_url}
                size={36}
              />
            </Link>
            <Link
              href={getAgentPath(agentId, chainId)}
              className="font-semibold text-black hover:text-black transition-colors"
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
              href={getExplorerTxUrl(kudos.txHash, chainId)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-black/50/50 hover:text-black transition-colors"
              title="View transaction"
            >
              {timestamp ? formatRelativeTime(timestamp) : 'tx'} ↗
            </a>
          </div>
        </div>

        {twitterHandle && !senderAgent && (
          <p className="text-[11px] text-black/50/60 mt-1">
            Submitted via ACK relay, attributed to {senderName}
          </p>
        )}

        {message && (
          <p className="text-xs text-black/50/70 mt-1 line-clamp-2 leading-relaxed">
            &ldquo;{message}&rdquo;
          </p>
        )}

        {tipFromAddress && (
          <TipAttribution
            fromAddress={tipFromAddress}
            fromAgent={
              tipFromAgent
                ? {
                    name: tipFromAgent.name,
                    chainId: tipFromAgent.chain_id,
                    tokenId: tipFromAgent.token_id,
                  }
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
}

export function KudosFeed({
  agentId,
  chainId = DEFAULT_8004_CHAIN_ID,
}: {
  agentId: number;
  chainId?: number;
}) {
  const { data: kudos, isLoading, error } = useKudosReceived(agentId, chainId);
  const { data: agents } = useLeaderboard({
    limit: 50,
    chainId,
    sortBy: 'total_score',
  });

  const blockNumbers = kudos?.map((k) => k.blockNumber) || [];
  const senders = kudos?.map((k) => k.sender) || [];
  const txHashes = kudos?.map((k) => k.txHash) || [];
  const { data: timestamps } = useBlockTimestamps(blockNumbers, chainId);
  const { data: agentSet } = useIsAgent(senders);
  const tipMap = useTipsForKudos(txHashes);
  const { data: standaloneTips } = useTipsFeed(
    chainId === DEFAULT_8004_CHAIN_ID ? agentId : undefined
  );

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
      <div className="text-black/50 text-sm animate-pulse">
        Loading onchain kudos...
      </div>
    );
  }

  if (error) {
    return <div className="text-red-400 text-sm">Failed to load kudos</div>;
  }

  const totalCount = (kudos?.length || 0) + (standaloneTips?.length || 0);

  if (!totalCount) {
    return (
      <div id="kudos-feed" className="text-black/50 text-sm">
        No onchain activity yet - be the first!
      </div>
    );
  }

  // Build merged feed: kudos entries + standalone tips, sorted by time
  type FeedItem =
    | { kind: 'kudos'; data: KudosEvent; ts: number }
    | { kind: 'tip'; data: StandaloneTip; ts: number };

  const feedItems: FeedItem[] = [];

  if (kudos) {
    for (const k of kudos) {
      const ts = timestamps?.get(k.blockNumber.toString());
      feedItems.push({ kind: 'kudos', data: k, ts: ts ? ts * 1000 : 0 });
    }
  }

  if (standaloneTips) {
    for (const t of standaloneTips) {
      feedItems.push({ kind: 'tip', data: t, ts: t.completedAt });
    }
  }

  feedItems.sort((a, b) => b.ts - a.ts);

  return (
    <div id="kudos-feed" className="space-y-3">
      <h3 className="text-sm font-medium text-black">
        Onchain Activity ({totalCount})
      </h3>
      {feedItems.map((item, i) => {
        if (item.kind === 'tip') {
          return (
            <TipCard
              key={`tip-${item.data.tipId}`}
              tip={item.data}
              receiverAgent={agentMap.get(agentId)}
            />
          );
        }
        const k = item.data;
        return (
          <KudosCard
            key={`${k.txHash}-${i}`}
            kudos={k}
            agentId={agentId}
            chainId={chainId}
            receiverAgent={agentMap.get(agentId)}
            senderAgent={senderMap.get(k.sender.toLowerCase())}
            timestamp={timestamps?.get(k.blockNumber.toString())}
            isSenderAgent={
              agentSet?.has(k.sender.toLowerCase()) ??
              !!senderMap.get(k.sender.toLowerCase())
            }
            tipAmountUsd={tipMap[k.txHash.toLowerCase()]?.amountUsd}
            tipFromAddress={tipMap[k.txHash.toLowerCase()]?.fromAddress}
            tipFromAgent={(() => {
              const tipInfo = tipMap[k.txHash.toLowerCase()];
              if (!tipInfo) return undefined;
              if (tipInfo.fromAgent) {
                return {
                  name: tipInfo.fromAgent.name,
                  chain_id: tipInfo.fromAgent.chainId,
                  token_id: tipInfo.fromAgent.tokenId,
                  image_url: tipInfo.fromAgent.imageUrl || null,
                } as ScanAgent;
              }
              if (tipInfo.fromAgentId) {
                return agentMap.get(tipInfo.fromAgentId);
              }
              return undefined;
            })()}
          />
        );
      })}
    </div>
  );
}
