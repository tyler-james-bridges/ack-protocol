'use client';

import { SUPPORTED_CHAINS } from '@/config/chains';

interface ChainBadgePillProps {
  chainId: number;
  count?: number;
  size?: 'sm' | 'md';
}

export function ChainBadgePill({
  chainId,
  count,
  size = 'sm',
}: ChainBadgePillProps) {
  const meta = SUPPORTED_CHAINS.find((c) => c.chain.id === chainId);
  const name = meta?.chain.name ?? `Chain ${chainId}`;
  const color = meta?.color ?? '#888';

  const dotSize = size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-gray-700 bg-gray-800 ${padding} ${textSize} font-medium text-gray-300`}
    >
      <span
        className={`${dotSize} shrink-0 rounded-full`}
        style={{ backgroundColor: color }}
      />
      <span className="truncate">{name}</span>
      {count !== undefined && <span className="text-gray-500">{count}</span>}
    </span>
  );
}
