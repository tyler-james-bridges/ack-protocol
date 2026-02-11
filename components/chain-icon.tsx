'use client';

import Image from 'next/image';

/**
 * Chain logos from Trust Wallet's open-source asset repo.
 * https://github.com/trustwallet/assets
 */
const CHAIN_ICONS: Record<number, { name: string; src: string }> = {
  1: {
    name: 'Ethereum',
    src: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
  },
  2741: {
    name: 'Abstract',
    src: '/chains/abstract.svg',
  },
  8453: {
    name: 'Base',
    src: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png',
  },
  42161: {
    name: 'Arbitrum',
    src: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png',
  },
  137: {
    name: 'Polygon',
    src: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png',
  },
  56: {
    name: 'BNB Chain',
    src: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/info/logo.png',
  },
  10: {
    name: 'Optimism',
    src: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png',
  },
  43114: {
    name: 'Avalanche',
    src: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/info/logo.png',
  },
  196: {
    name: 'XLayer',
    src: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/okc/info/logo.png',
  },
  6398: {
    name: 'Monad',
    src: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
  },
};

interface ChainIconProps {
  chainId: number;
  size?: number;
  className?: string;
}

export function ChainIcon({ chainId, size = 16, className }: ChainIconProps) {
  const chain = CHAIN_ICONS[chainId];

  if (!chain) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full bg-muted text-[8px] font-bold text-muted-foreground ${className || ''}`}
        style={{ width: size, height: size }}
      >
        ?
      </span>
    );
  }

  return (
    <Image
      src={chain.src}
      alt={chain.name}
      width={size}
      height={size}
      className={`rounded-full ${className || ''}`}
      unoptimized
    />
  );
}
