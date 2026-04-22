import type {
  ExecuteJobResult,
  ValidationResult,
} from '../../../runtime/offeringTypes.js';

const API = 'https://8004scan.io/api/v1/public';

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

async function fetchAgent(chainId: number, tokenId: string) {
  const res = await fetch(`${API}/agents/${chainId}/${tokenId}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data ?? null;
}

async function searchAgent(query: string) {
  const res = await fetch(
    `${API}/agents/search?q=${encodeURIComponent(query)}&limit=5`
  );
  if (!res.ok) return [];
  const json = await res.json();
  return json?.data ?? [];
}

export async function executeJob(request: any): Promise<ExecuteJobResult> {
  const input = typeof request === 'string' ? JSON.parse(request) : request;
  const agentQuery = input.agent || input.agentId || '';
  const chainFilter = input.chain?.toLowerCase();

  let agent: any = null;

  // Try chain:id format
  const colonMatch = agentQuery.match(/^(\d+):(\d+)$/);
  if (colonMatch) {
    agent = await fetchAgent(Number(colonMatch[1]), colonMatch[2]);
  }

  // Try pure numeric (token ID) with optional chain filter
  if (!agent && /^\d+$/.test(agentQuery)) {
    const chains =
      chainFilter && CHAIN_MAP[chainFilter]
        ? [CHAIN_MAP[chainFilter]]
        : [2741, 8453, 1, 42220];
    for (const c of chains) {
      agent = await fetchAgent(c, agentQuery);
      if (agent) break;
    }
  }

  // Try search by name
  if (!agent) {
    const results = await searchAgent(agentQuery);
    if (results.length > 0) {
      const first = results[0];
      agent = await fetchAgent(first.chain_id, first.token_id);
    }
  }

  if (!agent) {
    return {
      deliverable: JSON.stringify({
        error: 'Agent not found',
        query: agentQuery,
        suggestion:
          'Try a token ID (e.g. 606), chain:id (e.g. 2741:606), or agent name.',
      }),
    };
  }

  const report = {
    agent: {
      name: agent.name,
      chain_id: agent.chain_id,
      token_id: agent.token_id,
      description: agent.description?.slice(0, 200),
    },
    scores: {
      total: agent.total_score,
      rank: agent.rank,
      quality: agent.quality_score,
      popularity: agent.popularity_score,
      freshness: agent.freshness_score,
      activity: agent.activity_score,
      health: agent.health_score,
      wallet: agent.wallet_score,
    },
    engagement: {
      total_feedbacks: agent.total_feedbacks,
      star_count: agent.star_count,
      watch_count: agent.watch_count,
    },
    trust: {
      health_status: agent.health_status?.overall_status,
      is_endpoint_verified: agent.is_endpoint_verified,
      x402_supported: agent.x402_supported,
      supported_protocols: agent.supported_protocols,
      supported_trust_models: agent.supported_trust_models,
    },
    metadata: {
      categories: agent.categories,
      warnings: (agent.parse_status?.warnings ?? []).map((w: any) => w.code),
      services: (agent.services ?? []).map((s: any) => s.name),
    },
    cross_chain: agent.cross_chain_links ?? [],
    link: `https://8004scan.io/agents/${agent.chain_id === 2741 ? 'abstract' : agent.chain_id === 8453 ? 'base' : agent.chain_id === 1 ? 'ethereum' : agent.chain_id === 42220 ? 'celo' : agent.chain_id}/${agent.token_id}`,
    powered_by: 'ACK Protocol (ERC-8004)',
  };

  return { deliverable: JSON.stringify(report, null, 2) };
}

export function validateRequirements(request: any): ValidationResult {
  const input = typeof request === 'string' ? JSON.parse(request) : request;
  if (!input.agent && !input.agentId) {
    return { valid: false, reason: 'Missing required field: agent' };
  }
  return { valid: true };
}

export function requestPayment(_request: any): string {
  return 'ACK onchain reputation report. Live data from 8004scan across 45+ chains.';
}
