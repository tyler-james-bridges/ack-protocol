import { abstract, abstractTestnet, base, mainnet } from 'viem/chains';
import type { Chain } from 'viem';

/**
 * Chain configuration for the Agent Kudos app.
 * Defaults to Abstract mainnet. Set NEXT_PUBLIC_CHAIN=testnet for dev.
 */
export const chain =
  process.env.NEXT_PUBLIC_CHAIN === 'testnet' ? abstractTestnet : abstract;

/**
 * Abstract chain ID for ERC-8004 agent registry references
 */
export const ABSTRACT_CHAIN_ID = abstract.id;

export interface ChainConfig {
  chain: Chain;
  rpcUrl: string;
  deployBlock: number;
  explorer: string;
  /** Max block range per eth_getLogs call (free RPCs have different limits) */
  maxLogRange: number;
}

/**
 * All chains where ERC-8004 contracts (IdentityRegistry + ReputationRegistry)
 * are deployed at the canonical deterministic addresses.
 */
export const SUPPORTED_8004_CHAINS: Record<number, ChainConfig> = {
  2741: {
    chain: abstract,
    rpcUrl: 'https://api.mainnet.abs.xyz',
    deployBlock: 39_500_000,
    explorer: 'https://abscan.org',
    maxLogRange: 500_000,
  },
  8453: {
    chain: base,
    rpcUrl: 'https://mainnet.base.org',
    deployBlock: 41_664_000,
    explorer: 'https://basescan.org',
    maxLogRange: 9_999,
  },
  1: {
    chain: mainnet,
    rpcUrl: 'https://eth.drpc.org',
    deployBlock: 24_339_880,
    explorer: 'https://etherscan.io',
    maxLogRange: 9_999,
  },
} as const;

export const DEFAULT_8004_CHAIN_ID = ABSTRACT_CHAIN_ID;

/** Resolve a chain name or ID to the numeric chain ID. Returns undefined if unsupported. */
export function resolveChainId(
  input: string | number | undefined
): number | undefined {
  if (input === undefined || input === null) return undefined;
  if (typeof input === 'number') {
    return SUPPORTED_8004_CHAINS[input] ? input : undefined;
  }
  const lower = String(input).toLowerCase();
  const nameMap: Record<string, number> = {
    abstract: 2741,
    base: 8453,
    ethereum: 1,
    eth: 1,
    mainnet: 1,
  };
  const id = nameMap[lower] ?? Number(lower);
  if (isNaN(id)) return undefined;
  return SUPPORTED_8004_CHAINS[id] ? id : undefined;
}

/** Resolve a chain ID to config, falling back to Abstract for legacy callers. */
export function getChainConfig(chainId?: number): ChainConfig {
  return (
    (chainId !== undefined ? SUPPORTED_8004_CHAINS[chainId] : undefined) ??
    SUPPORTED_8004_CHAINS[DEFAULT_8004_CHAIN_ID]
  );
}

export function getExplorerTxUrl(txHash: string, chainId?: number): string {
  return `${getChainConfig(chainId).explorer}/tx/${txHash}`;
}

export function getAgentPath(
  agentId: string | number,
  chainId?: number
): string {
  return `/agent/${chainId ?? DEFAULT_8004_CHAIN_ID}/${agentId}`;
}

export function getChainSlug(chainId: number): string {
  const slugs: Record<number, string> = {
    1: 'ethereum',
    2741: 'abstract',
    8453: 'base',
    42161: 'arbitrum',
    137: 'polygon',
    56: 'bsc',
    10: 'optimism',
    43114: 'avalanche',
    196: 'xlayer',
    100: 'gnosis',
    42220: 'celo',
  };
  return slugs[chainId] || String(chainId);
}
