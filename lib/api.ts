/**
 * 8004scan API client
 *
 * All requests go through our Next.js API proxy (/api/agents)
 * to avoid CORS issues. The proxy forwards to 8004scan's REST API.
 *
 * On-chain writes (giveFeedback) go through wagmi hooks directly.
 */

const PROXY = '/api/agents';

/**
 * Shape of an agent as returned by the list endpoint (/agents) and search.
 * The list endpoint returns a slim projection — detail-only fields
 * (agent_wallet, tags, categories, services, scores, raw_metadata,
 * creator_address, is_active) are absent and must be treated as optional.
 *
 * Use `ScanAgentDetail` (from `fetchAgent`) when you need those fields
 * without null-guards.
 */
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
  image_url: string | null;
  is_verified: boolean;
  star_count: number;
  total_score: number;
  total_feedbacks: number;
  average_score: number;
  supported_protocols: string[];
  created_at: string;
  updated_at: string;
  // Fields present on detail endpoint but not the list endpoint — optional
  // here so list-backed components stay safe. `ScanAgentDetail` narrows them.
  creator_address?: string;
  agent_wallet?: string;
  is_active?: boolean;
  tags?: string[];
  categories?: string[];
  services?: Record<string, { endpoint?: string } | null> | null;
  raw_metadata?: {
    offchain_content?: {
      services?: { name: string; endpoint?: string }[];
    };
  } | null;
  scores?: {
    rank: number;
    freshness: number;
    popularity: number;
    chain_rank: number;
  } | null;
}

/**
 * Rich agent shape returned by the detail endpoint (/agents/{chainId}/{tokenId}).
 * Only `services` stays nullable — an agent may declare no services — but all
 * other detail-only fields are guaranteed by the upstream API.
 */
export interface ScanAgentDetail extends ScanAgent {
  creator_address: string;
  agent_wallet: string;
  is_active: boolean;
  tags: string[];
  categories: string[];
  raw_metadata: NonNullable<ScanAgent['raw_metadata']>;
  scores: NonNullable<ScanAgent['scores']>;
  // services intentionally left as-is — may be null on agents with no declared endpoints.
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

// Unwrap the public API envelope ({success, data, meta}) into the shape the
// existing callers expect. List endpoints return {items, total, limit, offset};
// single-resource endpoints return `data` directly.
function unwrapEnvelope<T>(json: unknown): T {
  if (!json || typeof json !== 'object' || !('success' in json)) {
    return json as T;
  }
  const envelope = json as {
    data?: unknown;
    meta?: { pagination?: { total?: number; limit?: number; page?: number } };
  };
  const data = envelope.data;
  if (Array.isArray(data)) {
    const pagination = envelope.meta?.pagination;
    const limit = pagination?.limit ?? data.length;
    const page = pagination?.page ?? 1;
    return {
      items: data,
      total: pagination?.total ?? data.length,
      limit,
      offset: Math.max(0, (page - 1) * limit),
    } as T;
  }
  return (data ?? json) as T;
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
    const json = await response.json();
    return unwrapEnvelope<T>(json);
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
 *
 * Uses the public API's detail endpoint, which returns the rich agent record
 * including tags, categories, services, scores.breakdown, agent_wallet, and
 * raw_metadata — fields the list endpoint omits.
 */
export async function fetchAgent(scanId: string): Promise<ScanAgentDetail> {
  const [chainId, tokenId] = scanId.split(':');
  if (!chainId || !tokenId) {
    throw new Error('Invalid agent id');
  }
  try {
    return await proxyFetch<ScanAgentDetail>(`agents/${chainId}/${tokenId}`);
  } catch (err) {
    if (err instanceof Error && err.message.includes('404')) {
      throw new Error('Agent not found');
    }
    throw err;
  }
}

/**
 * Fetch agents filtered to a specific chain.
 */
export async function fetchAgentsByChain(
  chainId: number,
  options: Omit<FetchAgentsOptions, 'chainId'> = {}
): Promise<ScanAgentsResponse> {
  const result = await fetchAgents({ ...options, limit: options.limit || 100 });
  const filtered = result.items.filter(
    (a) => a.chain_id === chainId && !a.is_testnet
  );
  return { ...result, items: filtered, total: filtered.length };
}

/**
 * Fetch feedback for a specific agent.
 *
 * Uses the public API's top-level /feedbacks endpoint with chainId+tokenId
 * filters (replaces the old /agents/{chainId}/{tokenId}/feedbacks path that
 * 404s on the public API).
 */
export async function fetchAgentFeedback(
  chainId: number,
  tokenId: string
): Promise<unknown[]> {
  try {
    const data = await proxyFetch<{ items?: unknown[] }>('feedbacks', {
      chain_id: chainId,
      token_id: tokenId,
    });
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
