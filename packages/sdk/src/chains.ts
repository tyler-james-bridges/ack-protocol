import type { ChainId, ChainConfig } from './types.js'

/**
 * Supported blockchain configurations
 */
export const CHAIN_CONFIGS: Record<ChainId, ChainConfig> = {
  abstract: {
    id: 2741,
    name: 'Abstract',
    rpcUrl: 'https://api.mainnet.abs.xyz'
  },
  base: {
    id: 8453,
    name: 'Base',
    rpcUrl: 'https://mainnet.base.org'
  },
  ethereum: {
    id: 1,
    name: 'Ethereum',
    rpcUrl: 'https://eth.llamarpc.com'
  },
  bnb: {
    id: 56,
    name: 'BNB Smart Chain',
    rpcUrl: 'https://bsc-dataseed.binance.org'
  }
}

/**
 * Get chain configuration by ID
 * @param chainId - Chain identifier
 * @returns Chain configuration
 */
export function getChainConfig(chainId: ChainId): ChainConfig {
  const config = CHAIN_CONFIGS[chainId]
  if (!config) {
    throw new Error(`Unsupported chain: ${chainId}`)
  }
  return config
}

/**
 * Get all supported chain IDs
 * @returns Array of supported chain identifiers
 */
export function getSupportedChains(): ChainId[] {
  return Object.keys(CHAIN_CONFIGS) as ChainId[]
}