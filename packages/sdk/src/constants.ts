import { CONTRACT_ADDRESSES } from './contracts.js';

/**
 * Kudos feedback defaults per ERC-8004 best practices.
 * 5-star scale: value=5, valueDecimals=0 for positive kudos.
 */
export const KUDOS_VALUE = 5;
export const KUDOS_VALUE_DECIMALS = 0;

/**
 * Tag1 for kudos feedback — identifies ACK kudos in on-chain data.
 */
export const KUDOS_TAG1 = 'kudos' as const;

/**
 * Review feedback constants — supports negative values (-5 to +5).
 */
export const REVIEW_TAG1 = 'review' as const;
export const REVIEW_MIN_VALUE = -5;
export const REVIEW_MAX_VALUE = 5;
export const REVIEW_VALUE_DECIMALS = 0;

/**
 * Valid kudos categories — stored as tag2 in ERC-8004 giveFeedback().
 */
export const KUDOS_CATEGORIES = [
  'reliability',
  'speed',
  'accuracy',
  'creativity',
  'collaboration',
  'security',
] as const;

export type KudosCategory = (typeof KUDOS_CATEGORIES)[number];

/**
 * Category display metadata (labels, colors, descriptions).
 */
export const CATEGORY_META: Record<
  KudosCategory,
  { label: string; color: string; description: string }
> = {
  reliability: {
    label: 'Reliable',
    color: '#22c55e',
    description: 'Consistently delivers results',
  },
  speed: {
    label: 'Fast',
    color: '#3b82f6',
    description: 'Quick response and execution',
  },
  accuracy: {
    label: 'Accurate',
    color: '#a855f7',
    description: 'Gets it right the first time',
  },
  creativity: {
    label: 'Creative',
    color: '#f59e0b',
    description: 'Novel and unexpected solutions',
  },
  collaboration: {
    label: 'Collaborative',
    color: '#06b6d4',
    description: 'Works well with other agents',
  },
  security: {
    label: 'Secure',
    color: '#ef4444',
    description: 'Handles sensitive operations safely',
  },
};

/**
 * CAIP-10 formatted agent registry identifier.
 * Format: eip155:{chainId}:{identityRegistryAddress}
 */
export function AGENT_REGISTRY_CAIP10(chainId: number): string {
  return `eip155:${chainId}:${CONTRACT_ADDRESSES.IDENTITY_REGISTRY}`;
}

/**
 * Format an address as a CAIP-10 account ID.
 * @param address - Ethereum address
 * @param chainId - Chain ID (default: 2741 for Abstract)
 */
export function toCAIP10Address(address: string, chainId = 2741): string {
  return `eip155:${chainId}:${address}`;
}

/**
 * Approximate deployment blocks for ERC-8004 contracts per chain.
 * Avoids scanning from block 0 which is slow and may hit RPC limits.
 */
export const DEPLOYMENT_BLOCKS: Record<number, bigint> = {
  1: BigInt(21000000),
  8453: BigInt(20000000),
  56: BigInt(44000000),
  100: BigInt(37000000),
  2741: BigInt(1000000),
  42220: BigInt(28000000),
  42161: BigInt(250000000),
  10: BigInt(125000000),
  137: BigInt(62000000),
  534352: BigInt(10000000),
  43114: BigInt(50000000),
  59144: BigInt(10000000),
  167000: BigInt(500000),
  196: BigInt(1000000),
};

/**
 * Known event topic hashes for ERC-8004 contracts.
 */
export const EVENT_TOPICS = {
  NEW_FEEDBACK:
    '0x6a4a61743519c9d648a14e6493f47dbe3ff1aa29e7785c96c8326a205e58febc' as const,
} as const;
