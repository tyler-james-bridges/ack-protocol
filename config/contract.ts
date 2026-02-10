import type { Address } from 'viem';

/**
 * ERC-8004 contract addresses on Abstract (Chain ID: 2741)
 * These are deterministic deploys — same addresses across all ERC-8004 chains.
 */
export const IDENTITY_REGISTRY_ADDRESS: Address =
  '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';

export const REPUTATION_REGISTRY_ADDRESS: Address =
  '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63';

/**
 * Kudos categories — stored as tag2 in ERC-8004 giveFeedback()
 * tag1 is always "kudos" to identify our app's feedback
 */
export const KUDOS_TAG1 = 'kudos' as const;

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
