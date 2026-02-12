import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter } from '@/lib/rate-limit';
import { KUDOS_CATEGORIES, type KudosCategory } from '@/config/contract';
import type { ScanAgent, ScanAgentsResponse } from '@/lib/api';

const API_BASE = 'https://www.8004scan.io/api/v1';

// 30 requests/minute per IP
const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 30 });

// Cache discovered results for 2 minutes keyed by query string
const cache = new Map<string, { data: DiscoverResponse; ts: number }>();
const CACHE_TTL = 2 * 60_000;

/** Feedback item shape from 8004scan */
interface ScanFeedback {
  tag1?: string;
  tag2?: string;
  value?: number;
}

interface DiscoverAgent {
  chainId: number;
  agentId: number;
  name: string;
  description: string | null;
  ownerAddress: string;
  totalScore: number;
  totalFeedbacks: number;
  isVerified: boolean;
  imageUrl: string | null;
  tags: string[];
  kudosCount: number;
  topCategory: KudosCategory | null;
  categories: Record<KudosCategory, number>;
}

interface DiscoverResponse {
  agents: DiscoverAgent[];
  total: number;
  limit: number;
  offset: number;
}

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

const VALID_CATEGORIES = new Set<string>(KUDOS_CATEGORIES);
const MAX_LIMIT = 50;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  // Rate limit by IP
  const ip = clientIp(request);
  const rl = limiter.check(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Max 30 requests per minute.' },
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

  // Parse and validate query params
  const category = searchParams.get('category') || undefined;
  const chain = searchParams.get('chain');
  const limitParam = parseInt(searchParams.get('limit') || '20', 10);
  const offsetParam = parseInt(searchParams.get('offset') || '0', 10);
  const minScore = parseFloat(searchParams.get('min_score') || '0');

  if (category && !VALID_CATEGORIES.has(category)) {
    return NextResponse.json(
      {
        error: `Invalid category. Must be one of: ${KUDOS_CATEGORIES.join(', ')}`,
      },
      { status: 400 }
    );
  }

  if (chain && !/^\d+$/.test(chain)) {
    return NextResponse.json(
      { error: 'Invalid chain parameter. Must be a numeric chain ID.' },
      { status: 400 }
    );
  }

  const limit = Math.min(Math.max(1, limitParam), MAX_LIMIT);
  const offset = Math.max(0, offsetParam);

  // Check cache
  const cacheKey = `${chain || 'all'}:${category || 'all'}:${minScore}:${limit}:${offset}`;
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
    // Fetch agents from 8004scan with filters
    // We fetch more than requested to allow for client-side filtering
    const fetchLimit = Math.min((limit + offset) * 2, 200);
    const params = new URLSearchParams();
    params.set('limit', String(fetchLimit));
    params.set('offset', '0');
    params.set('sort_by', 'total_score');
    params.set('sort_order', 'desc');
    if (chain) params.set('chain_id', chain);

    const data = await scanFetch<ScanAgentsResponse>(
      `agents?${params.toString()}`
    );

    let agents = (data.items || []).filter(
      (a) => !a.is_testnet && a.total_score >= minScore
    );

    // If category filter is set, we need feedback data to filter by kudos category.
    // Fetch feedback for candidate agents in parallel.
    const enriched: DiscoverAgent[] = [];

    if (category) {
      // Fetch feedback in parallel for all candidates
      const withFeedback = await Promise.all(
        agents.map((agent) =>
          fetchFeedback(agent.chain_id, agent.token_id).then((feedbacks) =>
            enrichAgent(agent, feedbacks)
          )
        )
      );

      // Filter to agents that have kudos in the requested category
      for (const agent of withFeedback) {
        if (agent.categories[category as KudosCategory] > 0) {
          enriched.push(agent);
        }
      }
    } else {
      // No category filter — still enrich with kudos data but only for the
      // slice we'll actually return, to keep upstream calls bounded
      agents = agents.slice(offset, offset + limit);
      const withFeedback = await Promise.all(
        agents.map((agent) =>
          fetchFeedback(agent.chain_id, agent.token_id).then((feedbacks) =>
            enrichAgent(agent, feedbacks)
          )
        )
      );
      enriched.push(...withFeedback);
    }

    // Apply pagination (for category-filtered results where we fetched all first)
    const paginatedAgents = category
      ? enriched.slice(offset, offset + limit)
      : enriched;

    const result: DiscoverResponse = {
      agents: paginatedAgents,
      total: category ? enriched.length : data.total,
      limit,
      offset,
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
        error: `Failed to fetch agents: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 502 }
    );
  }
}

/** Enrich a ScanAgent with ACK kudos data. */
function enrichAgent(
  agent: ScanAgent,
  feedbacks: ScanFeedback[]
): DiscoverAgent {
  const categories = Object.fromEntries(
    KUDOS_CATEGORIES.map((c) => [c, 0])
  ) as Record<KudosCategory, number>;

  const kudosFeedbacks = feedbacks.filter((f) => f.tag1 === 'kudos');

  for (const f of kudosFeedbacks) {
    const cat = f.tag2 as KudosCategory;
    if (KUDOS_CATEGORIES.includes(cat)) {
      categories[cat]++;
    }
  }

  const kudosCount = kudosFeedbacks.length;
  const topCategory =
    kudosCount > 0
      ? (Object.entries(categories).sort(
          ([, a], [, b]) => b - a
        )[0][0] as KudosCategory)
      : null;

  return {
    chainId: agent.chain_id,
    agentId: Number(agent.token_id),
    name: agent.name || `Agent #${agent.token_id}`,
    description: agent.description,
    ownerAddress: agent.owner_address,
    totalScore: agent.total_score ?? 0,
    totalFeedbacks: agent.total_feedbacks ?? 0,
    isVerified: agent.is_verified,
    imageUrl: agent.image_url,
    tags: agent.tags || [],
    kudosCount,
    topCategory,
    categories,
  };
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
