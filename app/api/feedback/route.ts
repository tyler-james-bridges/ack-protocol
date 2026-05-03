/**
 * SERVERLESS CACHE LIMITATION
 * ---------------------------------------------------------------------------
 * This route (and the shared lib/feedback-cache.ts it imports) relies on an
 * in-memory cache for on-chain feedback events. In serverless environments
 * (e.g. Vercel), each cold start creates a fresh process with an empty cache,
 * triggering a full re-fetch from the deploy block. This means:
 *
 *   - The first request after a cold start will be slower (full log scan).
 *   - Concurrent cold starts on different isolates each maintain independent
 *     caches, so memory savings are per-isolate, not global.
 *   - Vercel Pro / Enterprise "function persistence" keeps isolates warm
 *     longer, which helps, but warm lifetimes are not guaranteed and vary
 *     with traffic patterns.
 *
 * For production at scale, consider migrating to an external cache (Redis,
 * KV, or a database) to share state across isolates and survive cold starts.
 * ---------------------------------------------------------------------------
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAllFeedbackEvents,
  getAllFeedbackEventsForChain,
} from '@/lib/feedback-cache';
import { resolveChainId } from '@/config/chain';

/**
 * GET /api/feedback
 *
 * Query params:
 *   - agentId: filter by agent token ID
 *   - sender: filter by sender address (lowercase)
 *   - handle: filter proxy kudos by X handle (tag1==='proxy' && tag2==='x:<handle>')
 *   - limit: max results (default 200)
 *   - counts: if "true", return { counts: { agentId: count }, total: N }
 *
 * All feedback events are cached server-side. One RPC call per minute max.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const agentIdParam = searchParams.get('agentId');
  const senderParam = searchParams.get('sender');
  const handleParam = searchParams.get('handle');
  const countsOnly = searchParams.get('counts') === 'true';
  const limitParam = parseInt(searchParams.get('limit') || '200', 10);
  const chainIdParam = searchParams.get('chainId');

  try {
    const targetChain = resolveChainId(chainIdParam ?? undefined);
    const all = targetChain
      ? await getAllFeedbackEventsForChain(targetChain)
      : await getAllFeedbackEvents();

    if (countsOnly) {
      const counts: Record<number, number> = {};
      for (const e of all) {
        counts[e.agentId] = (counts[e.agentId] || 0) + 1;
      }
      const total = Object.values(counts).reduce((sum, c) => sum + c, 0);
      return NextResponse.json(
        { counts, total },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
            'X-API-Version': '1',
          },
        }
      );
    }

    let filtered = all;

    if (agentIdParam) {
      const id = parseInt(agentIdParam, 10);
      filtered = filtered.filter((e) => e.agentId === id);
    }

    if (senderParam) {
      const addr = senderParam.toLowerCase();
      filtered = filtered.filter((e) => e.sender === addr);
    }

    if (handleParam) {
      const tag2Match = `x:${handleParam.toLowerCase()}`;
      filtered = filtered.filter(
        (e) => e.tag1 === 'proxy' && e.tag2 === tag2Match
      );
    }

    // Sort newest first
    filtered = filtered
      .sort((a, b) => parseInt(b.blockNumber) - parseInt(a.blockNumber))
      .slice(0, limitParam);

    return NextResponse.json(
      { events: filtered, total: filtered.length },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
          'X-API-Version': '1',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: `Failed to fetch feedback: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 502 }
    );
  }
}
