import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter } from '@/lib/rate-limit';
import { KUDOS_CATEGORIES, type KudosCategory } from '@/config/contract';
import type { ScanAgent, ScanAgentsResponse } from '@/lib/api';
import {
  getFeedbackByAgentId,
  getAllFeedbackEvents,
  type FeedbackEvent,
} from '@/lib/feedback-cache';

const API_BASE = 'https://www.8004scan.io/api/v1';

// 60 requests/minute per IP
const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 60 });

// Simple in-memory cache — 5 minute TTL
const cache = new Map<string, { data: ReputationResponse; ts: number }>();
const CACHE_TTL = 5 * 60_000;

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
        'X-API-Version': '1',
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
          'X-API-Version': '1',
          'X-RateLimit-Remaining': String(rl.remaining),
        },
      });
    }

    // Fetch feedback for each agent from shared cache
    const feedbackResults = await Promise.all(
      agentsOwned.map((agent) =>
        getFeedbackByAgentId(Number(agent.token_id)).then((feedbacks) => ({
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
      const kudosFeedbacks = feedbacks.filter((f) => f.tag1 === 'kudos');
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

    // Include proxy kudos for handles linked to these agents.
    // Proxy kudos are stored as tag1==='proxy', tag2==='x:<handle>' on agent #606.
    // We scan all feedback events for proxy entries where the handle is linked
    // to one of the user's agents (linkedAgentId matches).
    try {
      const allEvents = await getAllFeedbackEvents();
      const agentIdSet = new Set(agents.map((a) => a.agentId));
      const proxyEvents = allEvents.filter(
        (e) => e.tag1 === 'proxy' && e.tag2.startsWith('x:')
      );

      // For each proxy event, check if the handle maps to one of this user's agents.
      // We do a lightweight check: look for any proxy feedback where the linked agent
      // is in our set. Since we can't query HandleRegistry here efficiently, we use
      // the feedback-cache approach: count proxy events on agent #606 where the handle
      // is linked to the user's agents. We check by scanning for any feedback on the
      // user's agents that would indicate a link. For MVP, we use a simpler approach:
      // fetch linked handles via the HandleRegistry for each agent.
      // Since this is a cached endpoint, the cost is acceptable.
      if (proxyEvents.length > 0) {
        const { createPublicClient: createClient, http: httpTransport } =
          await import('viem');
        const { abstract: abstractChain } = await import('viem/chains');

        const rpcClient = createClient({
          chain: abstractChain,
          transport: httpTransport(),
        });

        const HANDLE_REGISTRY =
          process.env.HANDLE_REGISTRY_ADDRESS ||
          '0xf32ed012f0978a9b963df11743e797a108c94871';

        const handleHashAbi = [
          {
            name: 'handleHash',
            type: 'function',
            stateMutability: 'pure' as const,
            inputs: [
              { name: 'platform', type: 'string' as const },
              { name: 'handle', type: 'string' as const },
            ],
            outputs: [{ name: '', type: 'bytes32' as const }],
          },
          {
            name: 'getHandle',
            type: 'function',
            stateMutability: 'view' as const,
            inputs: [{ name: 'hash', type: 'bytes32' as const }],
            outputs: [
              {
                name: '',
                type: 'tuple' as const,
                components: [
                  { name: 'platform', type: 'string' as const },
                  { name: 'handle', type: 'string' as const },
                  { name: 'claimedBy', type: 'address' as const },
                  { name: 'linkedAgentId', type: 'uint256' as const },
                  { name: 'createdAt', type: 'uint256' as const },
                  { name: 'claimedAt', type: 'uint256' as const },
                ],
              },
            ],
          },
        ] as const;

        // Collect unique handles from proxy events
        const uniqueHandles = [
          ...new Set(proxyEvents.map((e) => e.tag2.replace('x:', ''))),
        ];

        // Check which handles are linked to user's agents
        for (const handle of uniqueHandles) {
          try {
            const hash = await rpcClient.readContract({
              address: HANDLE_REGISTRY as `0x${string}`,
              abi: handleHashAbi,
              functionName: 'handleHash',
              args: ['x', handle],
            });
            const data = await rpcClient.readContract({
              address: HANDLE_REGISTRY as `0x${string}`,
              abi: handleHashAbi,
              functionName: 'getHandle',
              args: [hash],
            });
            const linkedId = Number(data.linkedAgentId);
            if (linkedId > 0 && agentIdSet.has(linkedId)) {
              const matchingProxy = proxyEvents.filter(
                (e) => e.tag2 === `x:${handle}`
              );
              totalKudos += matchingProxy.length;
            }
          } catch {
            // Skip handles that fail lookup
          }
        }
      }
    } catch {
      // Proxy kudos lookup is best-effort — don't fail the whole request
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
        'X-API-Version': '1',
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
  return Object.fromEntries(KUDOS_CATEGORIES.map((c) => [c, 0])) as Record<
    KudosCategory,
    number
  >;
}
