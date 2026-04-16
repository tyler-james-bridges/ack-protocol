const API = "https://8004scan.io/api/v1/public";

const CHAIN_MAP: Record<string, number> = {
  abstract: 2741,
  base: 8453,
  ethereum: 1,
  celo: 42220,
  bsc: 56,
  arbitrum: 42161,
  polygon: 137,
  optimism: 10,
};

const CHAIN_SLUG: Record<number, string> = {
  2741: "abstract",
  8453: "base",
  1: "ethereum",
  42220: "celo",
};

export interface AgentDiscoveryInput {
  query: string;
  chain?: string;
  limit?: number;
}

export async function executeJob(input: AgentDiscoveryInput): Promise<string> {
  const query = input.query || "";
  const chainFilter = input.chain?.toLowerCase();
  const limit = Math.min(Math.max(input.limit ?? 5, 1), 20);

  const params = new URLSearchParams({ q: query, limit: String(limit) });
  if (chainFilter && CHAIN_MAP[chainFilter]) {
    params.set("chainId", String(CHAIN_MAP[chainFilter]));
  }

  const res = await fetch(`${API}/agents/search?${params}`);
  if (!res.ok) {
    return JSON.stringify({ error: "Search failed", status: res.status });
  }

  const json: any = await res.json();
  const agents = (json?.data ?? []).map((a: any) => ({
    name: a.name,
    chain_id: a.chain_id,
    token_id: a.token_id,
    total_score: a.total_score,
    health_score: a.health_score,
    total_feedbacks: a.total_feedbacks,
    is_endpoint_verified: a.is_endpoint_verified,
    x402_supported: a.x402_supported,
    supported_protocols: a.supported_protocols,
    description: a.description?.slice(0, 150),
    link: `https://8004scan.io/agents/${CHAIN_SLUG[a.chain_id] ?? a.chain_id}/${a.token_id}`,
  }));

  return JSON.stringify(
    {
      query,
      results: agents,
      total_found: json?.meta?.pagination?.total ?? agents.length,
      powered_by: "ACK Protocol (ERC-8004)",
    },
    null,
    2
  );
}
