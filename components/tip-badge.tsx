import Link from 'next/link';
import type { TipFromAgent } from '@/hooks/useTipsForKudos';

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function TipBadge({ amountUsd }: { amountUsd: number }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#00FF94]/10 text-[#00FF94] text-[10px] font-semibold px-1.5 py-0.5 tabular-nums">
      ${amountUsd.toFixed(amountUsd < 1 ? 2 : 0)}
    </span>
  );
}

export function TipAttribution({
  fromAddress,
  fromAgent,
}: {
  fromAddress: string;
  fromAgent?: { name: string; chainId: number; tokenId: string } | null;
}) {
  return (
    <p className="text-[11px] text-muted-foreground/60 mt-1">
      Tipped by{' '}
      {fromAgent ? (
        <Link
          href={`/agent/${fromAgent.chainId}/${fromAgent.tokenId}`}
          className="hover:text-[#00DE73] transition-colors font-semibold text-muted-foreground"
        >
          {fromAgent.name}
        </Link>
      ) : (
        <Link
          href={`/address/${fromAddress}`}
          className="hover:text-[#00DE73] transition-colors font-mono"
        >
          {truncateAddress(fromAddress)}
        </Link>
      )}
    </p>
  );
}
