/**
 * 8004scan API client
 *
 * All requests go through our Next.js API proxy (/api/agents)
 * to avoid CORS issues. The proxy forwards to 8004scan's REST API.
 *
 * On-chain writes (giveFeedback) go through wagmi hooks directly.
 */

const PROXY = '/api/agents';

export interface ScanAgent {
  id: string;
  agent_id: string;
  token_id: string;
  chain_id: number;
  is_testnet: boolean;
  contract_address: string;
  name: string;
  description: string | null;
  owner_address: string;
  creator_address: string;
  agent_wallet: string;
  image_url: string | null;
  is_verified: boolean;
  is_active: boolean;
  star_count: number;
  total_score: number;
  total_feedbacks: number;
  average_score: number;
  tags: string[];
  categories: string[];
  supported_protocols: string[];
  services: Record<string, unknown> | null;
  scores: {
    rank: number;
    freshness: number;
    popularity: number;
    chain_rank: number;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface ScanAgentsResponse {
  items: ScanAgent[];
  total: number;
  limit: number;
  offset: number;
}

export interface FetchAgentsOptions {
  chainId?: number;
  limit?: number;
  offset?: number;
  search?: string;
  sort?: string;
}

function proxyUrl(
  path: string,
  params?: Record<string, string | number | undefined>
): string {
  const searchParams = new URLSearchParams();
  searchParams.set('path', path);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) searchParams.set(key, String(value));
    }
  }
  return `${PROXY}?${searchParams.toString()}`;
}

async function proxyFetch<T>(
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<T> {
  const url = proxyUrl(path, params);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

/**
 * Fetch agents from 8004scan.
 */
export async function fetchAgents(
  options: FetchAgentsOptions = {}
): Promise<ScanAgentsResponse> {
  return proxyFetch<ScanAgentsResponse>('agents', {
    limit: options.limit,
    offset: options.offset,
    search: options.search,
    sort: options.sort,
  });
}

/**
 * Fetch a single agent by chain:tokenId.
 * 8004scan has no single-agent lookup or filter-by-token endpoint,
 * so we search by tokenId and match chain_id client-side.
 */
export async function fetchAgent(scanId: string): Promise<ScanAgent> {
  const [chainId, tokenId] = scanId.split(':');
  const data = await proxyFetch<ScanAgentsResponse>('agents', {
    search: tokenId,
    limit: 20,
  });
  const match = (data.items || []).find(
    (a) => a.token_id === tokenId && a.chain_id === Number(chainId)
  );
  if (!match) {
    throw new Error('Agent not found');
  }
  return match;
}

/**
 * Fetch agents filtered to a specific chain.
 */
export async function fetchAgentsByChain(
  chainId: number,
  options: Omit<FetchAgentsOptions, 'chainId'> = {}
): Promise<ScanAgentsResponse> {
  const result = await fetchAgents({ ...options, limit: options.limit || 50 });
  const filtered = result.items.filter(
    (a) => a.chain_id === chainId && !a.is_testnet
  );
  return { ...result, items: filtered, total: filtered.length };
}

/**
 * Fetch feedback for an agent.
 */
export async function fetchAgentFeedback(
  chainId: number,
  tokenId: string
): Promise<unknown[]> {
  try {
    const data = await proxyFetch<{ items?: unknown[] }>(
      `agents/${chainId}/${tokenId}/feedbacks`
    );
    return data.items || [];
  } catch {
    return [];
  }
}

/**
 * Fetch the leaderboard.
 * 8004scan has no leaderboard endpoint and no server-side sort,
 * so we fetch a large batch and sort client-side by total_score.
 */
export async function fetchLeaderboard(
  options: { limit?: number; chainId?: number; sortBy?: string } = {}
): Promise<ScanAgent[]> {
  const sortBy = options.sortBy || 'total_score';
  const displayLimit = options.limit || 50;

  if (!options.chainId) {
    // No chain filter — single fetch is fine
    const data = await proxyFetch<ScanAgentsResponse>('agents', {
      limit: 100,
      sort_by: sortBy,
      sort_order: 'desc',
    });
    return (data.items || [])
      .filter((a: ScanAgent) => !a.is_testnet)
      .slice(0, displayLimit);
  }

  // Chain filter active — paginate to find enough agents for this chain.
  // 8004scan ignores chain_id param, so we must filter client-side.
  const collected: ScanAgent[] = [];
  const pageSize = 100;
  const maxPages = 5; // Cap at 500 agents scanned

  for (let page = 0; page < maxPages; page++) {
    const data = await proxyFetch<ScanAgentsResponse>('agents', {
      limit: pageSize,
      offset: page * pageSize,
      sort_by: sortBy,
      sort_order: 'desc',
    });
    const items = data.items || [];
    if (items.length === 0) break;

    const matching = items.filter(
      (a: ScanAgent) => a.chain_id === options.chainId && !a.is_testnet
    );
    collected.push(...matching);

    // Stop if we have enough or exhausted results
    if (collected.length >= displayLimit || items.length < pageSize) break;
  }

  // Re-sort and limit
  const sortKey = sortBy as keyof ScanAgent;
  collected.sort((a, b) => (Number(b[sortKey]) || 0) - (Number(a[sortKey]) || 0));
  return collected.slice(0, displayLimit);
}
