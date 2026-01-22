import { type Address, isAddress } from 'viem';

/**
 * Zero address constant used as fallback when no contract is deployed
 */
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

/**
 * Contract address for the Kudos contract.
 * Reads from NEXT_PUBLIC_CONTRACT_ADDRESS environment variable.
 * Falls back to zero address if not configured.
 */
const contractAddr = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || ZERO_ADDRESS;
if (!isAddress(contractAddr)) {
  throw new Error(`Invalid contract address: ${contractAddr}`);
}
export const CONTRACT_ADDRESS: Address = contractAddr;

/**
 * Check if a valid contract is deployed (i.e., not using the zero address fallback)
 */
export function isContractDeployed(): boolean {
  return CONTRACT_ADDRESS !== ZERO_ADDRESS;
}

/**
 * Default paymaster address for sponsored transactions (Abstract testnet)
 */
const DEFAULT_PAYMASTER_ADDRESS = '0x5407B5040dec3D339A9247f3654E59EEccbb6391' as const;

/**
 * Paymaster address for sponsored transactions.
 * Reads from NEXT_PUBLIC_PAYMASTER_ADDRESS environment variable.
 * Falls back to default Abstract testnet paymaster if not configured.
 */
const paymasterAddr = process.env.NEXT_PUBLIC_PAYMASTER_ADDRESS || DEFAULT_PAYMASTER_ADDRESS;
if (!isAddress(paymasterAddr)) {
  throw new Error(`Invalid paymaster address: ${paymasterAddr}`);
}
export const PAYMASTER_ADDRESS: Address = paymasterAddr;
