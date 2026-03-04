'use client';

import { useQuery } from '@tanstack/react-query';
import { createPublicClient, http } from 'viem';
import { abstract } from 'viem/chains';

const HANDLE_REGISTRY =
  process.env.NEXT_PUBLIC_HANDLE_REGISTRY_ADDRESS ||
  '0xf32ed012f0978a9b963df11743e797a108c94871';

const client = createPublicClient({ chain: abstract, transport: http() });

const GET_HANDLES_BY_AGENT_ABI = [
  {
    name: 'getHandlesByAgent',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bytes32[]' }],
  },
  {
    name: 'getHandle',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'hash', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'platform', type: 'string' },
          { name: 'handle', type: 'string' },
          { name: 'claimedBy', type: 'address' },
          { name: 'linkedAgentId', type: 'uint256' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'claimedAt', type: 'uint256' },
        ],
      },
    ],
  },
] as const;

async function fetchLinkedHandles(agentId: number): Promise<string[]> {
  try {
    const hashes = await client.readContract({
      address: HANDLE_REGISTRY as `0x${string}`,
      abi: GET_HANDLES_BY_AGENT_ABI,
      functionName: 'getHandlesByAgent',
      args: [BigInt(agentId)],
    });

    if (!hashes || hashes.length === 0) return [];

    const handles = await Promise.all(
      hashes.map(async (hash) => {
        const data = await client.readContract({
          address: HANDLE_REGISTRY as `0x${string}`,
          abi: GET_HANDLES_BY_AGENT_ABI,
          functionName: 'getHandle',
          args: [hash],
        });
        return data.handle;
      })
    );

    return handles.filter(Boolean);
  } catch {
    // Contract may not have getHandlesByAgent — fall back gracefully
    return [];
  }
}

export function useLinkedHandles(agentId: number | undefined) {
  return useQuery({
    queryKey: ['linked-handles', agentId],
    queryFn: () => fetchLinkedHandles(agentId!),
    enabled: agentId !== undefined,
    staleTime: 300_000,
    gcTime: 600_000,
  });
}
