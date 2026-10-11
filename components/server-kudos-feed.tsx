import Link from 'next/link';
import { AgentAvatar } from './agent-avatar';
import { CategoryBadge } from './category-badge';
import { StreakBadge } from './streak-badge';
import { TipBadge, TipAttribution } from './tip-badge';
import { KUDOS_CATEGORIES, type KudosCategory } from '@/config/contract';
import { formatRelativeTime } from '@/lib/utils';
import type { RecentKudosItem } from '@/lib/home-data';
import type { ScanAgent } from '@/lib/api';
import type { StreakData } from '@/lib/streaks';
import { getTipByKudosTxHash } from '@/lib/tip-store';
import {
  ABSTRACT_CHAIN_ID,
  DEFAULT_8004_CHAIN_ID,
  getAgentPath,
  getChainSlug,
  getExplorerTxUrl,
} from '@/config/chain';

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}\u2009..\u2009${addr.slice(-4)}`;
}

interface ServerKudosFeedProps {
  kudos: RecentKudosItem[];
  agentMap: Map<number, ScanAgent>;
  senderMap: Map<string, ScanAgent>;
  timestamps: Record<string, number>;
  streaks?: Record<string, StreakData>;
  chainId: number;
  feedError?: boolean;
}

function FeedItem({
  kudos,
  agent,
  senderAgent,
  timestamp,
  senderStreak,
  tipAmountUsd,
  tipFromAddress,
  tipFromAgent,
}: {
  kudos: RecentKudosItem;
  agent?: ScanAgent;
  senderAgent?: ScanAgent;
  timestamp?: number;
  senderStreak?: StreakData;
  tipAmountUsd?: number;
  tipFromAddress?: string;
  tipFromAgent?: ScanAgent;
}) {
  const isValidCategory = KUDOS_CATEGORIES.includes(
    kudos.tag2 as KudosCategory
  );
  const name = agent?.name || `Agent #${kudos.agentId}`;
  const senderName = senderAgent?.name || kudos.sender;

  const senderLink = senderAgent
    ? `/agent/${senderAgent.chain_id}/${senderAgent.token_id}`
    : `/address/${kudos.sender}`;

  return (
    <div className="flex gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted transition-colors">
      <Link href={senderLink} className="shrink-0 mt-0.5">
        <AgentAvatar
          name={senderName}
          imageUrl={senderAgent?.image_url}
          size={32}
          className="rounded-lg"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <Link
              href={senderLink}
              className={`text-xs hover:underline transition-colors ${senderAgent ? 'font-bold text-foreground' : ' text-muted-foreground'}`}
            >
              {senderAgent ? senderAgent.name : truncateAddress(kudos.sender)}
            </Link>
            {senderStreak && senderStreak.currentStreak > 0 && (
              <StreakBadge
                streak={senderStreak.currentStreak}
                isActive={senderStreak.isActiveToday}
                size="sm"
              />
            )}
            <span className="text-xs text-muted-foreground uppercase">
              gave
            </span>
            <Link
              href={getAgentPath(kudos.agentId, kudos.chainId)}
              className="shrink-0"
            >
              <AgentAvatar
                name={name}
                imageUrl={agent?.image_url}
                size={32}
                className="rounded-lg"
              />
            </Link>
            <Link
              href={getAgentPath(kudos.agentId, kudos.chainId)}
              className="text-xs font-bold text-foreground hover:underline transition-colors"
            >
              {name}
            </Link>
            <span className="text-xs text-muted-foreground uppercase">
              kudos
            </span>
            {tipAmountUsd !== undefined && tipAmountUsd > 0 && (
              <TipBadge amountUsd={tipAmountUsd} />
            )}
            {isValidCategory && (
              <>
                <span className="text-xs text-muted-foreground uppercase">
                  for
                </span>
                <CategoryBadge category={kudos.tag2 as KudosCategory} />
              </>
            )}
          </div>
          <a
            href={getExplorerTxUrl(kudos.txHash, kudos.chainId)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
          >
            {timestamp ? formatRelativeTime(timestamp) : 'tx'}
          </a>
        </div>

        {kudos.message && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
            &ldquo;{kudos.message}&rdquo;
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

export async function ServerKudosFeed({
  kudos,
  agentMap,
  senderMap,
  timestamps,
  streaks,
  chainId,
  feedError = false,
}: ServerKudosFeedProps) {
  return (
    <div className="overflow-hidden bg-background flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="type-heading">Latest kudos</h2>
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href={`/?chain=${getChainSlug(DEFAULT_8004_CHAIN_ID)}`}
            className={`inline-flex min-h-8 items-center rounded-md px-2.5 text-xs font-medium ${chainId === DEFAULT_8004_CHAIN_ID ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
          >
            Base
          </Link>
          <Link
            href={`/?chain=${getChainSlug(ABSTRACT_CHAIN_ID)}`}
            className={`inline-flex min-h-8 items-center rounded-md px-2.5 text-xs font-medium ${chainId === ABSTRACT_CHAIN_ID ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
          >
            Abstract
          </Link>
          <Link
            href={`/kudos?chain=${getChainSlug(chainId)}`}
            className="inline-flex min-h-8 items-center px-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View all &rarr;
          </Link>
        </div>
      </div>

      <div>
        {feedError ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Could not load kudos.
            </p>
          </div>
        ) : kudos.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No kudos yet - be the first!
            </p>
          </div>
        ) : (
          await Promise.all(
            kudos.map(async (k, i) => {
              const tip = await getTipByKudosTxHash(k.txHash);
              let tipFromAgent = tip?.fromAgentId
                ? agentMap.get(tip.fromAgentId)
                : undefined;
              if (!tipFromAgent && tip?.fromAgentId) {
                try {
                  const { fetchAgent } = await import('@/lib/api');
                  tipFromAgent = await fetchAgent(
                    `${tip.chainId}:${tip.fromAgentId}`
                  );
                } catch {
                  // Agent not found, leave undefined
                }
              }
              return (
                <FeedItem
                  key={`${k.txHash}-${i}`}
                  kudos={k}
                  agent={agentMap.get(k.agentId)}
                  senderAgent={senderMap.get(k.sender.toLowerCase())}
                  timestamp={timestamps[k.blockNumber]}
                  senderStreak={streaks?.[k.sender.toLowerCase()]}
                  tipAmountUsd={tip?.amountUsd}
                  tipFromAddress={tip?.fromAddress}
                  tipFromAgent={tipFromAgent}
                />
              );
            })
          )
        )}
      </div>
    </div>
  );
}
