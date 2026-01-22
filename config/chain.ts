import { abstract, abstractTestnet } from "viem/chains";

/**
 * Chain configuration for the Kudos application.
 * Uses NEXT_PUBLIC_CHAIN environment variable to select the chain:
 * - 'mainnet' -> Abstract mainnet
 * - anything else (or unset) -> Abstract testnet (default)
 */
export const chain = process.env.NEXT_PUBLIC_CHAIN === 'mainnet'
  ? abstract
  : abstractTestnet;
