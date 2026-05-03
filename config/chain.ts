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
  },
  8453: {
    chain: base,
    rpcUrl: 'https://mainnet.base.org',
    deployBlock: 41_500_000,
    explorer: 'https://basescan.org',
  },
  1: {
    chain: mainnet,
    rpcUrl: 'https://eth.drpc.org',
    deployBlock: 24_300_000,
    explorer: 'https://etherscan.io',
  },
} as const;

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
