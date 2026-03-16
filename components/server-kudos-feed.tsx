import Link from 'next/link';
import { AgentAvatar } from './agent-avatar';
import { CategoryBadge } from './category-badge';
import { StreakBadge } from './streak-badge';
import { KUDOS_CATEGORIES, type KudosCategory } from '@/config/contract';
import { formatRelativeTime } from '@/lib/utils';
import type { RecentKudosItem } from '@/lib/home-data';
import type { ScanAgent } from '@/lib/api';
import type { StreakData } from '@/lib/streaks';
import { getTipByKudosTxHash } from '@/lib/tip-store';

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}\u2009..\u2009${addr.slice(-4)}`;
}

interface ServerKudosFeedProps {
  kudos: RecentKudosItem[];
  agentMap: Map<number, ScanAgent>;
  senderMap: Map<string, ScanAgent>;
  timestamps: Record<string, number>;
  streaks?: Record<string, StreakData>;
}

function TipBadge({ amountUsd }: { amountUsd: number }) {
  const display =
    amountUsd < 1 ? `$${amountUsd.toFixed(2)}` : `$${amountUsd.toFixed(0)}`;
  return (
    <span className="inline-flex items-center rounded-full bg-[#00DE73]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#00DE73]">
      {display}
    </span>
  );
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
    <div className="flex gap-3 px-4 py-3 border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors">
      <Link href={senderLink} className="shrink-0 mt-0.5">
        <AgentAvatar
          name={senderName}
          imageUrl={senderAgent?.image_url}
          size={32}
        />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <Link
              href={senderLink}
              className={`text-xs hover:text-[#00DE73] transition-colors ${senderAgent ? 'font-semibold text-foreground' : 'font-mono text-muted-foreground'}`}
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
            <span className="text-xs text-muted-foreground">gave</span>
            <Link href={`/agent/2741/${kudos.agentId}`} className="shrink-0">
              <AgentAvatar name={name} imageUrl={agent?.image_url} size={32} />
            </Link>
            <Link
              href={`/agent/2741/${kudos.agentId}`}
              className="text-xs font-semibold text-foreground hover:text-[#00DE73] transition-colors"
            >
              {name}
            </Link>
            <span className="text-xs text-muted-foreground">kudos</span>
            {tipAmountUsd !== undefined && tipAmountUsd > 0 && (
              <TipBadge amountUsd={tipAmountUsd} />
            )}
            {isValidCategory && (
              <>
                <span className="text-xs text-muted-foreground">for</span>
                <CategoryBadge category={kudos.tag2 as KudosCategory} />
              </>
            )}
          </div>
          <a
            href={`https://abscan.org/tx/${kudos.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-muted-foreground/50 hover:text-[#00DE73] transition-colors shrink-0 mt-0.5"
          >
            {timestamp ? formatRelativeTime(timestamp) : 'tx'}
          </a>
        </div>

        {kudos.message && (
          <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2 leading-relaxed">
            &ldquo;{kudos.message}&rdquo;
          </p>
        )}

        {tipFromAddress && (
          <p className="text-[11px] text-muted-foreground/60 mt-1">
            Tipped by{' '}
            {tipFromAgent ? (
              <Link
                href={`/agent/${tipFromAgent.chain_id}/${tipFromAgent.token_id}`}
                className="hover:text-[#00DE73] transition-colors font-semibold text-muted-foreground"
              >
                {tipFromAgent.name}
              </Link>
            ) : (
              <Link
                href={`/address/${tipFromAddress}`}
                className="hover:text-[#00DE73] transition-colors font-mono"
              >
                {truncateAddress(tipFromAddress)}
              </Link>
            )}
          </p>
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
}: ServerKudosFeedProps) {
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card/50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00DE73] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00DE73]" />
          </span>
          <h2 className="text-sm font-bold uppercase tracking-wider">
            Latest Kudos
          </h2>
        </div>
        <Link
          href="/kudos"
          className="text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          View all →
        </Link>
      </div>

      <div>
        {kudos.length === 0 ? (
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
              // If not in local map, fetch from 8004scan
              if (!tipFromAgent && tip?.fromAgentId) {
                try {
                  const { fetchAgent } = await import('@/lib/api');
                  tipFromAgent = await fetchAgent(`2741:${tip.fromAgentId}`);
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
