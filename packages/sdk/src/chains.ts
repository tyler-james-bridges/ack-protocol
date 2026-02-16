import type { ChainId, ChainConfig } from './types.js';

/**
 * Supported blockchain configurations
 */
export const CHAIN_CONFIGS: Record<ChainId, ChainConfig> = {
  abstract: {
    id: 2741,
    name: 'Abstract',
    rpcUrl: 'https://api.mainnet.abs.xyz',
  },
  base: {
    id: 8453,
    name: 'Base',
    rpcUrl: 'https://mainnet.base.org',
  },
  ethereum: {
    id: 1,
    name: 'Ethereum',
    rpcUrl: 'https://eth.llamarpc.com',
  },
  bnb: {
    id: 56,
    name: 'BNB Smart Chain',
    rpcUrl: 'https://bsc-dataseed.binance.org',
  },
  celo: {
    id: 42220,
    name: 'Celo',
    rpcUrl: 'https://forno.celo.org',
  },
  gnosis: {
    id: 100,
    name: 'Gnosis',
    rpcUrl: 'https://rpc.gnosischain.com',
  },
  arbitrum: {
    id: 42161,
    name: 'Arbitrum',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
  },
  optimism: {
    id: 10,
    name: 'Optimism',
    rpcUrl: 'https://mainnet.optimism.io',
  },
  polygon: {
    id: 137,
    name: 'Polygon',
    rpcUrl: 'https://polygon-rpc.com',
  },
  scroll: {
    id: 534352,
    name: 'Scroll',
    rpcUrl: 'https://rpc.scroll.io',
  },
  avalanche: {
    id: 43114,
    name: 'Avalanche',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
  },
  linea: {
    id: 59144,
    name: 'Linea',
    rpcUrl: 'https://rpc.linea.build',
  },
  taiko: {
    id: 167000,
    name: 'Taiko',
    rpcUrl: 'https://rpc.mainnet.taiko.xyz',
  },
  xlayer: {
    id: 196,
    name: 'X Layer',
    rpcUrl: 'https://rpc.xlayer.tech',
  },
};

/**
 * Get chain configuration by ID
 * @param chainId - Chain identifier
 * @returns Chain configuration
 */
export function getChainConfig(chainId: ChainId): ChainConfig {
  const config = CHAIN_CONFIGS[chainId];
  if (!config) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }
  return config;
}

/**
 * Get all supported chain IDs
 * @returns Array of supported chain identifiers
 */
export function getSupportedChains(): ChainId[] {
  return Object.keys(CHAIN_CONFIGS) as ChainId[];
}
