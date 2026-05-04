import type { Address } from 'viem';
import { DEFAULT_8004_CHAIN_ID } from './chain';

/**
 * USDC.e token on Abstract (chain ID 2741)
 */
export const USDC_ADDRESS: Address =
  '0x84a71ccd554cc1b02749b35d22f684cc8ec987e1';

/**
 * Native USDC token on Base (chain ID 8453)
 */
export const BASE_USDC_ADDRESS: Address =
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

export const USDC_DECIMALS = 6;

export interface UsdcTokenConfig {
  address: Address;
  decimals: number;
  symbol: 'USDC';
  chainId: number;
}

export const USDC_BY_CHAIN: Record<number, UsdcTokenConfig> = {
  2741: {
    address: USDC_ADDRESS,
    decimals: USDC_DECIMALS,
    symbol: 'USDC',
    chainId: 2741,
  },
  8453: {
    address: BASE_USDC_ADDRESS,
    decimals: USDC_DECIMALS,
    symbol: 'USDC',
    chainId: 8453,
  },
};

export function getUsdcTokenConfig(chainId?: number): UsdcTokenConfig {
  return (
    USDC_BY_CHAIN[chainId ?? DEFAULT_8004_CHAIN_ID] ??
    USDC_BY_CHAIN[DEFAULT_8004_CHAIN_ID]
  );
}

export function getUsdcAddress(chainId?: number): Address {
  return getUsdcTokenConfig(chainId).address;
}

/**
 * Standard ERC-20 transfer ABI fragment used for USDC transfers.
 */
export const ERC20_TRANSFER_ABI = [
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

/**
 * PENGU token on Abstract (chain ID 2741)
 */
export const PENGU_ADDRESS: Address =
  '0x9eBe3A824Ca958e4b3Da772D2065518F009CBa62';

export const PENGU_DECIMALS = 18;

/**
 * Fallback treasury address for tips when agent owner cannot be resolved.
 */
export const ACK_TREASURY_ADDRESS: Address =
  '0x668aDd9213985E7Fd613Aec87767C892f4b9dF1c';
