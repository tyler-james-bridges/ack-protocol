'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAgents } from '@/lib/api';
import type { Address } from 'viem';

/**
 * Given a list of addresses, returns a Set of those that are registered agents.
 * Uses 8004scan API instead of individual RPC balanceOf calls.
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
      const result = await fetchAgents({ chainId: 2741, limit: 50 });
      const agentAddresses = new Set<string>();
      for (const a of result.items) {
        if (a.owner_address) agentAddresses.add(a.owner_address.toLowerCase());
        if (a.creator_address)
          agentAddresses.add(a.creator_address.toLowerCase());
        if (a.agent_wallet) agentAddresses.add(a.agent_wallet.toLowerCase());
      }
      for (const addr of addresses) {
        if (agentAddresses.has(addr.toLowerCase())) {
          agents.add(addr.toLowerCase());
        }
      }
      return agents;
    },
    staleTime: 120_000,
    enabled: addresses.length > 0,
  });
}
