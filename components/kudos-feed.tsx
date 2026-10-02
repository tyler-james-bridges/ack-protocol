'use client';

import Link from 'next/link';
import { useKudosReceived } from '@/hooks/useKudosReceived';
import { useLeaderboard } from '@/hooks';
import { AgentAvatar } from '@/components/agent-avatar';
import { CategoryBadge } from '@/components/category-badge';
import { KUDOS_CATEGORIES, type KudosCategory } from '@/config/contract';
import {
  useBlockTimestamps,
  formatRelativeTime,
} from '@/hooks/useBlockTimestamps';
import { useTipsForKudos } from '@/hooks/useTipsForKudos';
import { useTipsFeed } from '@/hooks/useTipsFeed';
import { TipCard } from '@/components/tip-card';
import { TipBadge } from '@/components/tip-badge';
import { groupSenders } from '@/lib/activity';
import type { ScanAgent } from '@/lib/api';
import { DEFAULT_8004_CHAIN_ID, getExplorerTxUrl } from '@/config/chain';

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
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
  const rows = groupSenders(kudos ?? [], 16);
  const blockNumbers = rows.map((row) => row.event.blockNumber);
  const txHashes = rows.map((row) => row.event.txHash);
  const { data: timestamps } = useBlockTimestamps(blockNumbers, chainId);
  const tipMap = useTipsForKudos(txHashes);
  const { data: standaloneTips } = useTipsFeed(agentId, chainId);

  const agentMap = new Map<number, ScanAgent>();
  const senderMap = new Map<string, ScanAgent>();
  if (agents) {
    for (const agent of agents) {
      agentMap.set(Number(agent.token_id), agent);
      if (agent.owner_address)
        senderMap.set(agent.owner_address.toLowerCase(), agent);
      if (agent.agent_wallet)
        senderMap.set(agent.agent_wallet.toLowerCase(), agent);
    }
  }

  if (isLoading) {
    return (
      <div className="text-sm text-black/70">Loading onchain kudos...</div>
    );
  }

  if (error) {
    return <div className="text-sm text-black/70">Could not load kudos.</div>;
  }

  const shown = kudos?.length ?? 0;
  const recordTotal = kudos?.total ?? shown;
  const capped = kudos?.capped === true && recordTotal > shown;
  const tips = standaloneTips ?? [];

  if (!shown && tips.length === 0) {
    return (
      <div id="kudos-feed" className="text-sm text-black/70">
        No onchain activity yet. Be the first.
      </div>
    );
  }

  return (
    <div id="kudos-feed" className="border-2 border-black">
      <div className="px-4 py-3 border-b border-black">
        <h3 className="text-sm font-bold font-mono uppercase tracking-wider">
          Latest activity
        </h3>
        <p className="mt-1 text-sm text-black/70">
          {capped
            ? `Recent senders. The record is ${recordTotal.toLocaleString()} kudos.`
            : `${recordTotal.toLocaleString()} kudos`}
        </p>
      </div>
      {tips.map((tip) => (
        <TipCard
          key={`tip-${tip.tipId}`}
          tip={tip}
          receiverAgent={agentMap.get(agentId)}
        />
      ))}
      {rows.map(({ event, count }) => {
        const senderAgent = senderMap.get(event.sender.toLowerCase());
        const senderName = senderAgent?.name || truncateAddress(event.sender);
        const senderLink = senderAgent
          ? `/agent/${senderAgent.chain_id}/${senderAgent.token_id}`
          : `/address/${event.sender}`;
        const timestamp = timestamps?.get(event.blockNumber.toString());
        const tip = tipMap[event.txHash.toLowerCase()];
        const category = KUDOS_CATEGORIES.includes(event.tag2 as KudosCategory)
          ? (event.tag2 as KudosCategory)
          : null;
        return (
          <div
            key={event.sender}
            className="flex items-center gap-3 px-4 py-3 border-b border-black/10 last:border-b-0"
          >
            <Link href={senderLink} className="shrink-0">
              <AgentAvatar
                name={senderName}
                imageUrl={senderAgent?.image_url}
                size={28}
              />
            </Link>
            <Link
              href={senderLink}
              className="min-w-0 text-sm font-semibold truncate hover:underline"
            >
              {senderName}
            </Link>
            <span className="text-sm text-black/70 shrink-0">
              {count === 1 ? '1 kudo' : `${count.toLocaleString()} kudos`}
            </span>
            {category && <CategoryBadge category={category} />}
            {tip && tip.amountUsd > 0 && <TipBadge amountUsd={tip.amountUsd} />}
            <a
              href={getExplorerTxUrl(event.txHash, chainId)}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-xs font-mono text-black/60 hover:text-black shrink-0"
            >
              {timestamp ? formatRelativeTime(timestamp) : 'tx'}
            </a>
          </div>
        );
      })}
    </div>
  );
}
