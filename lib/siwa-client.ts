import { createPublicClient, http, type PublicClient } from 'viem';
import { SUPPORTED_8004_CHAINS } from '@/config/chain';

export function publicClientForRegistry(
  agentRegistry: string
): PublicClient | null {
  const parts = agentRegistry.split(':');
  if (parts.length !== 3 || parts[0] !== 'eip155') return null;
  const chainId = Number(parts[1]);
  const cfg = SUPPORTED_8004_CHAINS[chainId];
  if (!cfg) return null;
  return createPublicClient({
    chain: cfg.chain,
    transport: http(cfg.rpcUrl),
  });
}

export function registryFromMessage(message: string): string | null {
  const line = message
    .split('\n')
    .find((entry) => entry.startsWith('Agent Registry:'));
  if (!line) return null;
  const registry = line.slice('Agent Registry:'.length).trim();
  return registry || null;
}
