import type { Address } from 'viem';
import { chain } from './chain';

/**
 * ERC-8004 contract addresses on Abstract (Chain ID: 2741)
 * These are deterministic deploys — same addresses across all ERC-8004 chains.
 */
export const IDENTITY_REGISTRY_ADDRESS: Address =
  '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';

export const REPUTATION_REGISTRY_ADDRESS: Address =
  '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63';

/**
 * Abstract Global Wallet paymaster — sponsors gas for all AGW transactions.
 * Used with useWriteContractSponsored + getGeneralPaymasterInput.
 */
export const ABSTRACT_PAYMASTER_ADDRESS: Address =
  '0x5407B5040dec3D339A9247f3654E59EEccbb6391';

/**
 * CAIP-10 formatted agent registry identifier per ERC-8004 spec
 * Format: eip155:{chainId}:{identityRegistryAddress}
 */
export const AGENT_REGISTRY_CAIP10 =
  `eip155:${chain.id}:${IDENTITY_REGISTRY_ADDRESS}` as const;

/** Format an address as CAIP-10 account ID */
export function toCAIP10Address(address: string): string {
  return `eip155:${chain.id}:${address}`;
}

/**
 * Kudos feedback defaults per ERC-8004 best practices
 * Using 5-star scale: value=5, valueDecimals=0 for positive kudos
 */
export const KUDOS_VALUE = 5; // 5-star positive endorsement
export const KUDOS_VALUE_DECIMALS = 0;

/**
 * Kudos categories — stored as tag2 in ERC-8004 giveFeedback()
 * tag1 is always "kudos" to identify our app's feedback
 */
export const KUDOS_TAG1 = 'kudos' as const;

/**
 * Review feedback constants — supports negative values (-5 to +5)
 */
export const REVIEW_TAG1 = 'review' as const;
export const REVIEW_MIN_VALUE = -5;
export const REVIEW_MAX_VALUE = 5;
export const REVIEW_VALUE_DECIMALS = 0;

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
 * Category display metadata
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
