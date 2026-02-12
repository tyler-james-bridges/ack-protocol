import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter } from '@/lib/rate-limit';
import { KUDOS_CATEGORIES, type KudosCategory } from '@/config/contract';
import type { ScanAgent, ScanAgentsResponse } from '@/lib/api';

const API_BASE = 'https://www.8004scan.io/api/v1';

// 60 requests/minute per IP
const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 60 });

// Simple in-memory cache — 5 minute TTL
const cache = new Map<string, { data: ReputationResponse; ts: number }>();
const CACHE_TTL = 5 * 60_000;

/** Feedback item shape from 8004scan */
interface ScanFeedback {
  tag1?: string;
  tag2?: string;
  value?: number;
  value_decimals?: number;
  feedback_uri?: string;
}

interface AgentReputation {
  chainId: number;
  agentId: number;
  name: string;
  totalScore: number;
}

interface ReputationResponse {
  address: string;
  agents: AgentReputation[];
  aggregatedScore: number;
  totalKudos: number;
  topCategory: KudosCategory | null;
  categories: Record<KudosCategory, number>;
}

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

const ETH_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  // Validate Ethereum address
  if (!ETH_ADDRESS.test(address)) {
    return NextResponse.json(
      { error: 'Invalid Ethereum address' },
      { status: 400 }
    );
  }

  // Rate limit by IP
  const ip = clientIp(request);
  const rl = limiter.check(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Max 60 requests per minute.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(rl.resetAt / 1000)),
        },
      }
    );
  }

  // Check cache
  const cacheKey = address.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data, {
      headers: {
        'X-Cache': 'HIT',
        'X-RateLimit-Remaining': String(rl.remaining),
      },
    });
  }

  try {
    // Fetch agents owned by this address — paginate to get up to 200
    const agentsOwned = await fetchAgentsByOwner(address);

    if (agentsOwned.length === 0) {
      const empty: ReputationResponse = {
        address,
        agents: [],
        aggregatedScore: 0,
        totalKudos: 0,
        topCategory: null,
        categories: emptyCategoryCounts(),
      };
      cache.set(cacheKey, { data: empty, ts: Date.now() });
      return NextResponse.json(empty, {
        headers: {
          'X-Cache': 'MISS',
          'X-RateLimit-Remaining': String(rl.remaining),
        },
      });
    }

    // Fetch feedback for each agent in parallel
    const feedbackResults = await Promise.all(
      agentsOwned.map((agent) =>
        fetchFeedback(agent.chain_id, agent.token_id).then((feedbacks) => ({
          agent,
          feedbacks,
        }))
      )
    );

    // Aggregate
    const categories = emptyCategoryCounts();
    let totalKudos = 0;
    const agents: AgentReputation[] = [];

    for (const { agent, feedbacks } of feedbackResults) {
      // Count kudos from feedbacks where tag1 === "kudos"
      const kudosFeedbacks = feedbacks.filter(
        (f: ScanFeedback) => f.tag1 === 'kudos'
      );
      totalKudos += kudosFeedbacks.length;

      for (const f of kudosFeedbacks) {
        const cat = f.tag2 as KudosCategory;
        if (KUDOS_CATEGORIES.includes(cat)) {
          categories[cat]++;
        }
      }

      agents.push({
        chainId: agent.chain_id,
        agentId: Number(agent.token_id),
        name: agent.name || `Agent #${agent.token_id}`,
        totalScore: agent.total_score ?? 0,
      });
    }

    // Aggregated score: average of all agent scores (weighted equally)
    const aggregatedScore =
      agents.length > 0
        ? Math.round(
            (agents.reduce((sum, a) => sum + a.totalScore, 0) / agents.length) *
              10
          ) / 10
        : 0;

    // Top category: the one with the most kudos
    const topCategory =
      totalKudos > 0
        ? (Object.entries(categories).sort(
            ([, a], [, b]) => b - a
          )[0][0] as KudosCategory)
        : null;

    const result: ReputationResponse = {
      address,
      agents,
      aggregatedScore,
      totalKudos,
      topCategory,
      categories,
    };

    cache.set(cacheKey, { data: result, ts: Date.now() });

    return NextResponse.json(result, {
      headers: {
        'X-Cache': 'MISS',
        'X-RateLimit-Remaining': String(rl.remaining),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Failed to fetch reputation: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 502 }
    );
  }
}

/** Fetch all agents owned by an address across chains. */
async function fetchAgentsByOwner(ownerAddress: string): Promise<ScanAgent[]> {
  const pageSize = 100;
  const results: ScanAgent[] = [];

  // Fetch first page to get total count
  const first = await scanFetch<ScanAgentsResponse>(
    `agents?owner_address=${ownerAddress}&limit=${pageSize}&offset=0`
  );
  results.push(...(first.items || []));

  // If there are more, fetch remaining pages in parallel
  if (first.total > pageSize) {
    const remaining = Math.min(Math.ceil(first.total / pageSize), 3) - 1;
    const pages = await Promise.all(
      Array.from({ length: remaining }, (_, i) =>
        scanFetch<ScanAgentsResponse>(
          `agents?owner_address=${ownerAddress}&limit=${pageSize}&offset=${(i + 1) * pageSize}`
        )
      )
    );
    for (const page of pages) {
      results.push(...(page.items || []));
    }
  }

  // Filter out testnets, dedupe by id
  const seen = new Set<string>();
  return results.filter((a) => {
    if (a.is_testnet || seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}

/** Fetch feedback for a specific agent. */
async function fetchFeedback(
  chainId: number,
  tokenId: string
): Promise<ScanFeedback[]> {
  try {
    const data = await scanFetch<{ items?: ScanFeedback[] }>(
      `agents/${chainId}/${tokenId}/feedbacks`
    );
    return data.items || [];
  } catch {
    return [];
  }
}

/** Direct fetch to 8004scan (server-side, no CORS proxy needed). */
async function scanFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}/${path}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 30 },
  });
  if (!response.ok) {
    throw new Error(`8004scan error: ${response.status}`);
  }
  return response.json();
}

function emptyCategoryCounts(): Record<KudosCategory, number> {
  return Object.fromEntries(
    KUDOS_CATEGORIES.map((c) => [c, 0])
  ) as Record<KudosCategory, number>;
}
