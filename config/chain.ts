import { abstract, abstractTestnet } from 'viem/chains';

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
