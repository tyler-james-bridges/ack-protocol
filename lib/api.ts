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
  services: Record<string, { endpoint?: string } | null> | null;
  raw_metadata?: {
    offchain_content?: {
      services?: { name: string; endpoint?: string }[];
    };
  } | null;
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
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
    chain_id: chainId,
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
// Cache the full agent pool so filter/sort switches are instant
let agentPoolCache: { agents: ScanAgent[]; ts: number } | null = null;
const POOL_TTL = 120_000; // 2 min

async function getAgentPool(): Promise<ScanAgent[]> {
  if (agentPoolCache && Date.now() - agentPoolCache.ts < POOL_TTL) {
    return agentPoolCache.agents;
  }

  // Fetch 5 pages in parallel (500 agents)
  const pageSize = 100;
  const pages = [0, 1, 2, 3, 4];
  const results = await Promise.all(
    pages.map((page) =>
      proxyFetch<ScanAgentsResponse>('agents', {
        limit: pageSize,
        offset: page * pageSize,
        sort_by: 'total_score',
        sort_order: 'desc',
      })
    )
  );

  const all = results
    .flatMap((r) => r.items || [])
    .filter((a) => !a.is_testnet);
  // Dedupe by id
  const seen = new Set<string>();
  const deduped = all.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  agentPoolCache = { agents: deduped, ts: Date.now() };
  return deduped;
}

function sortAgents(agents: ScanAgent[], sortBy: string): ScanAgent[] {
  const sorted = [...agents];
  if (sortBy === 'created_at') {
    sorted.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } else {
    const sortKey = sortBy as keyof ScanAgent;
    sorted.sort(
      (a, b) => (Number(b[sortKey]) || 0) - (Number(a[sortKey]) || 0)
    );
  }
  return sorted;
}

export async function fetchLeaderboard(
  options: { limit?: number; chainId?: number; sortBy?: string } = {}
): Promise<ScanAgent[]> {
  const sortBy = options.sortBy || 'created_at';
  const displayLimit = options.limit || 100;

  // For chain-specific queries, fetch directly with chain_id param
  // (the global pool sorted by score misses small-chain agents)
  if (options.chainId) {
    const data = await proxyFetch<ScanAgentsResponse>('agents', {
      chain_id: options.chainId,
      limit: displayLimit,
    });
    const agents = (data.items || []).filter((a) => !a.is_testnet);
    return sortAgents(agents, sortBy);
  }

  // For "All Chains", use the cached global pool
  const pool = await getAgentPool();
  return sortAgents(pool, sortBy).slice(0, displayLimit);
}
