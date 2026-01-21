import { type Address } from 'viem';

/**
 * Zero address constant used as fallback when no contract is deployed
 */
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

/**
 * Contract address for the Kudos contract.
 * Reads from NEXT_PUBLIC_CONTRACT_ADDRESS environment variable.
 * Falls back to zero address if not configured.
 */
export const CONTRACT_ADDRESS: Address = (
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || ZERO_ADDRESS
) as Address;

/**
 * Check if a valid contract is deployed (i.e., not using the zero address fallback)
 */
export function isContractDeployed(): boolean {
  return CONTRACT_ADDRESS !== ZERO_ADDRESS;
}

/**
 * Abstract testnet paymaster address for sponsored transactions
 */
export const PAYMASTER_ADDRESS = '0x5407B5040dec3D339A9247f3654E59EEccbb6391' as Address;
