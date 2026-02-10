'use client';

import { useReadContract, useReadContracts } from 'wagmi';
import { IDENTITY_REGISTRY_ABI } from '@/config/abi';
import { IDENTITY_REGISTRY_ADDRESS } from '@/config/contract';
import { chain } from '@/config/chain';
import type { Address } from 'viem';

const registryConfig = {
  address: IDENTITY_REGISTRY_ADDRESS,
  abi: IDENTITY_REGISTRY_ABI,
  chainId: chain.id,
} as const;

/**
 * Get the total number of registered agents.
 */
export function useAgentCount() {
  return useReadContract({
    ...registryConfig,
    functionName: 'totalSupply',
  });
}

/**
 * Get the owner address of a specific agent.
 */
export function useAgentOwner(agentId: number | undefined) {
  return useReadContract({
    ...registryConfig,
    functionName: 'ownerOf',
    args: agentId !== undefined ? [BigInt(agentId)] : undefined,
    query: { enabled: agentId !== undefined },
  });
}

/**
 * Get the agentURI (token URI) for a specific agent.
 */
export function useAgentURI(agentId: number | undefined) {
  return useReadContract({
    ...registryConfig,
    functionName: 'tokenURI',
    args: agentId !== undefined ? [BigInt(agentId)] : undefined,
    query: { enabled: agentId !== undefined },
  });
}

/**
 * Get the wallet address associated with an agent.
 */
export function useAgentWallet(agentId: number | undefined) {
  return useReadContract({
    ...registryConfig,
    functionName: 'getAgentWallet',
    args: agentId !== undefined ? [BigInt(agentId)] : undefined,
    query: { enabled: agentId !== undefined },
  });
}

/**
 * Get on-chain metadata for an agent by key.
 */
export function useAgentMetadata(
  agentId: number | undefined,
  key: string | undefined
) {
  return useReadContract({
    ...registryConfig,
    functionName: 'getMetadata',
    args:
      agentId !== undefined && key !== undefined
        ? [BigInt(agentId), key]
        : undefined,
    query: { enabled: agentId !== undefined && key !== undefined },
  });
}

/**
 * Batch-fetch core data for a list of agent IDs.
 * Returns owner + tokenURI for each agent in one multicall.
 */
export function useAgentBatch(agentIds: number[]) {
  const contracts = agentIds.flatMap((id) => [
    {
      ...registryConfig,
      functionName: 'ownerOf' as const,
      args: [BigInt(id)] as const,
    },
    {
      ...registryConfig,
      functionName: 'tokenURI' as const,
      args: [BigInt(id)] as const,
    },
  ]);

  const result = useReadContracts({
    contracts,
    query: { enabled: agentIds.length > 0 },
  });

  const agents =
    result.data && agentIds.length > 0
      ? agentIds.map((id, i) => {
          const ownerResult = result.data[i * 2];
          const uriResult = result.data[i * 2 + 1];
          return {
            agentId: id,
            owner: (ownerResult?.result as Address) ?? null,
            agentURI: (uriResult?.result as string) ?? null,
          };
        })
      : [];

  return {
    ...result,
    agents,
  };
}
