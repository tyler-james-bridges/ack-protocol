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
  type FeedbackEvent,
} from '@/lib/feedback-cache';
import { kudosWindow } from '@/lib/activity';
import {
  readBaseCounts,
  readBaseHistory,
  readBaseRecent,
} from '@/lib/base-feedback-store';
import { resolveChainId } from '@/config/chain';

const BASE_CHAIN_ID = 8453;
const ABSTRACT_CHAIN_ID = 2741;

function countEvents(events: FeedbackEvent[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const event of events) {
    counts[event.agentId] = (counts[event.agentId] || 0) + 1;
  }
  return counts;
}

function totalOf(counts: Record<number, number>): number {
  return Object.values(counts).reduce((sum, count) => sum + count, 0);
}

function countsRecord(counts: Map<number, number>): Record<number, number> {
  const record: Record<number, number> = {};
  for (const [agentId, count] of counts) {
    record[agentId] = count;
  }
  return record;
}

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

    if (countsOnly && targetChain === BASE_CHAIN_ID) {
      const { coverage, counts } = await readBaseCounts();
      const record = countsRecord(counts);
      return NextResponse.json(
        { counts: record, total: totalOf(record), coverage },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
            'X-API-Version': '1',
          },
        }
      );
    }

    if (countsOnly && targetChain === ABSTRACT_CHAIN_ID) {
      try {
        const all = await getAllFeedbackEventsForChain(ABSTRACT_CHAIN_ID);
        const counts = countEvents(all);
        return NextResponse.json(
          {
            counts,
            total: totalOf(counts),
            coverage: { status: 'complete' },
          },
          {
            headers: {
              'Cache-Control':
                'public, s-maxage=60, stale-while-revalidate=120',
              'X-API-Version': '1',
            },
          }
        );
      } catch {
        return NextResponse.json(
          { counts: {}, total: 0, coverage: { status: 'absent' } },
          {
            headers: {
              'Cache-Control':
                'public, s-maxage=60, stale-while-revalidate=120',
              'X-API-Version': '1',
            },
          }
        );
      }
    }

    if (countsOnly) {
      const all = targetChain
        ? await getAllFeedbackEventsForChain(targetChain)
        : await getAllFeedbackEvents();
      const counts = countEvents(all);
      return NextResponse.json(
        { counts, total: totalOf(counts) },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
            'X-API-Version': '1',
          },
        }
      );
    }

    if (targetChain === BASE_CHAIN_ID) {
      return baseEventsResponse({
        agentIdParam,
        senderParam,
        handleParam,
        limitParam,
      });
    }

    const all = targetChain
      ? await getAllFeedbackEventsForChain(targetChain)
      : await getAllFeedbackEvents();

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

async function baseEventsResponse(input: {
  agentIdParam: string | null;
  senderParam: string | null;
  handleParam: string | null;
  limitParam: number;
}): Promise<NextResponse> {
  const headers = {
    'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
    'X-API-Version': '1',
  };
  if (
    input.agentIdParam !== null &&
    Number.isNaN(parseInt(input.agentIdParam, 10))
  ) {
    return NextResponse.json({ events: [], total: 0 }, { headers });
  }
  const agentId =
    input.agentIdParam !== null ? parseInt(input.agentIdParam, 10) : undefined;
  const sender = input.senderParam?.toLowerCase();
  const hasIdentity = agentId !== undefined || Boolean(sender);
  const loaded = hasIdentity
    ? await readBaseHistory({
        agentId,
        sender,
        limit: input.limitParam,
      })
    : { events: await readBaseRecent(input.limitParam) };

  let filtered = loaded.events;
  if (input.handleParam) {
    const tag2Match = `x:${input.handleParam.toLowerCase()}`;
    filtered = filtered.filter(
      (event) => event.tag1 === 'proxy' && event.tag2 === tag2Match
    );
  }
  const events = [...filtered]
    .sort((a, b) => parseInt(b.blockNumber, 10) - parseInt(a.blockNumber, 10))
    .slice(0, input.limitParam);

  let archiveTotal: number | null = null;
  if (agentId !== undefined) {
    try {
      const { coverage, counts } = await readBaseCounts();
      if (coverage.status !== 'absent') {
        archiveTotal = counts.get(agentId) ?? 0;
      }
    } catch {
      archiveTotal = null;
    }
  }
  const windowed = kudosWindow(archiveTotal, events.length);

  return NextResponse.json(
    {
      events,
      total: windowed.total,
      shown: events.length,
      capped: windowed.capped,
    },
    { headers }
  );
}
