import type { Address } from 'viem';

/**
 * USDC.e token on Abstract (chain ID 2741)
 */
export const USDC_ADDRESS: Address =
  '0x84a71ccd554cc1b02749b35d22f684cc8ec987e1';

export const USDC_DECIMALS = 6;

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
 * Fallback treasury address for tips when agent owner cannot be resolved.
 */
export const ACK_TREASURY_ADDRESS: Address =
  '0x668aDd9213985E7Fd613Aec87767C892f4b9dF1c';
