import { DEFAULT_8004_CHAIN_ID } from '@/config/chain';
import type { ScanAgent } from '@/lib/api';
import { readBaseCounts } from '@/lib/base-feedback-store';

const SCAN_API = 'https://8004scan.io/api/v1/public';
const BASE_CHAIN_ID = 8453;

export type ExploreAgent = ScanAgent & { kudos: number };

export async function getExploreBaseAgents(): Promise<ExploreAgent[]> {
  const chainId = DEFAULT_8004_CHAIN_ID;
  const items = await fetchChainAgents(chainId);
  const counts =
    chainId === BASE_CHAIN_ID ? await baseCounts() : new Map<number, number>();
  const seen = new Set<string>();
  const agents: ExploreAgent[] = [];
  for (const agent of items) {
    if (agent.is_testnet) continue;
    const key = `${agent.chain_id}:${agent.token_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    agents.push({
      ...agent,
      kudos: counts.get(Number(agent.token_id)) ?? 0,
    });
  }
  agents.sort((a, b) => b.kudos - a.kudos || b.total_score - a.total_score);
  return agents;
}

async function baseCounts(): Promise<Map<number, number>> {
  try {
    const result = await readBaseCounts();
    if (result.coverage.status === 'absent') return new Map();
    return result.counts;
  } catch {
    return new Map();
  }
}

async function fetchChainAgents(chainId: number): Promise<ScanAgent[]> {
  const params = new URLSearchParams({
    chainId: String(chainId),
    sortBy: 'total_score',
    sortOrder: 'desc',
    limit: '100',
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${SCAN_API}/agents?${params}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) return [];
    const json = await response.json();
    return (json.data as ScanAgent[]) || [];
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
