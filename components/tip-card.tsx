'use client';

import Link from 'next/link';
import { AgentAvatar } from '@/components/agent-avatar';
import { IdentityBadge } from '@/components/identity-badge';
import { TipBadge } from '@/components/tip-badge';
import type { StandaloneTip } from '@/hooks/useTipsFeed';
import type { ScanAgent } from '@/lib/api';
import { getAgentPath, getExplorerTxUrl } from '@/config/chain';

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatRelativeTime(ts: number): string {
  const now = Date.now();
  const diff = Math.floor((now - ts) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function TipCard({
  tip,
  receiverAgent,
}: {
  tip: StandaloneTip;
  receiverAgent?: ScanAgent;
}) {
  const payerName = tip.fromAgent?.name || truncateAddress(tip.fromAddress);
  const payerLink = tip.fromAgent
    ? `/agent/${tip.fromAgent.chainId}/${tip.fromAgent.tokenId}`
    : `/address/${tip.fromAddress}`;
  const receiverName = receiverAgent?.name || `Agent #${tip.agentId}`;

  return (
    <div className="flex gap-3 border border-black/20 rounded-none p-4 bg-black/5/50 hover:border-[#00FF94]/40 transition-colors">
      {/* Payer avatar */}
      <Link href={payerLink} className="shrink-0 mt-0.5">
        <AgentAvatar
          name={payerName}
          imageUrl={tip.fromAgent?.imageUrl || undefined}
          size={36}
        />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap text-xs text-black/50">
            <Link
              href={payerLink}
              className={`hover:text-black transition-colors ${tip.fromAgent ? 'font-semibold text-black' : 'font-mono'}`}
            >
              {payerName}
            </Link>
            <IdentityBadge type={tip.fromAgent ? 'agent' : 'human'} />
            <span>tipped</span>
            <Link
              href={getAgentPath(tip.agentId, tip.chainId)}
              className="shrink-0"
            >
              <AgentAvatar
                name={receiverName}
                imageUrl={receiverAgent?.image_url}
                size={36}
              />
            </Link>
            <Link
              href={getAgentPath(tip.agentId, tip.chainId)}
              className="font-semibold text-black hover:text-black transition-colors"
            >
              {receiverName}
            </Link>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
            <TipBadge amountUsd={tip.amountUsd} />
            {tip.paymentTxHash &&
              tip.paymentTxHash !== 'x402-facilitator-settlement' && (
                <a
                  href={getExplorerTxUrl(tip.paymentTxHash, tip.chainId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-black/50/50 hover:text-black transition-colors"
                  title="View payment transaction"
                >
                  {formatRelativeTime(tip.completedAt)} ↗
                </a>
              )}
            {(!tip.paymentTxHash ||
              tip.paymentTxHash === 'x402-facilitator-settlement') && (
              <span className="text-[11px] text-black/50/50">
                {formatRelativeTime(tip.completedAt)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
