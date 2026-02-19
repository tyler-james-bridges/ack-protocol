'use client';

import { useQuery } from '@tanstack/react-query';
import { createPublicClient, http } from 'viem';
import { abstract } from 'viem/chains';
import type { Address } from 'viem';

const IDENTITY_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432' as const;

const balanceOfAbi = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const client = createPublicClient({
  chain: abstract,
  transport: http('https://api.mainnet.abs.xyz'),
});

/**
 * Given a list of addresses, returns a Set of those that are registered agents.
 * Uses onchain balanceOf multicall against the Identity Registry contract.
 */
export function useIsAgent(addresses: Address[]) {
  const key = addresses
    .map((a) => a.toLowerCase())
    .sort()
    .join(',');

  return useQuery({
    queryKey: ['is-agent', key],
    queryFn: async () => {
      const agents = new Set<string>();
      const results = await client.multicall({
        contracts: addresses.map((addr) => ({
          address: IDENTITY_REGISTRY,
          abi: balanceOfAbi,
          functionName: 'balanceOf' as const,
          args: [addr] as const,
        })),
      });
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (r.status === 'success' && (r.result as bigint) > BigInt(0)) {
          agents.add(addresses[i].toLowerCase());
        }
      }
      return agents;
    },
    staleTime: 120_000,
    enabled: addresses.length > 0,
  });
}
