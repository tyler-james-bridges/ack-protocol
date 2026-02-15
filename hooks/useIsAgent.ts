'use client';

import { useQuery } from '@tanstack/react-query';
import { createPublicClient, http, type Address } from 'viem';
import { abstract } from 'viem/chains';

const IDENTITY_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432' as const;

const client = createPublicClient({ chain: abstract, transport: http() });

const balanceOfAbi = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

/**
 * Check which addresses are registered agents (have an ERC-8004 identity).
 * Returns a Set of lowercase addresses that are agents.
 */
async function checkAgentStatus(addresses: Address[]): Promise<Set<string>> {
  const unique = [...new Set(addresses.map((a) => a.toLowerCase()))];
  const agents = new Set<string>();

  // Batch in parallel (max 10 concurrent)
  const BATCH = 10;
  for (let i = 0; i < unique.length; i += BATCH) {
    const batch = unique.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map((addr) =>
        client
          .readContract({
            address: IDENTITY_REGISTRY,
            abi: balanceOfAbi,
            functionName: 'balanceOf',
            args: [addr as Address],
          })
          .catch(() => BigInt(0))
      )
    );
    results.forEach((bal, j) => {
      if (bal > BigInt(0)) agents.add(batch[j]);
    });
  }

  return agents;
}

/**
 * Given a list of addresses, returns a Set of those that are registered agents.
 * Cached for 2 minutes.
 */
export function useIsAgent(addresses: Address[]) {
  const key = addresses
    .map((a) => a.toLowerCase())
    .sort()
    .join(',');

  return useQuery({
    queryKey: ['is-agent', key],
    queryFn: () => checkAgentStatus(addresses),
    staleTime: 120_000,
    enabled: addresses.length > 0,
  });
}
