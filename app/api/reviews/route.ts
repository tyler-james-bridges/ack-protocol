/**
 * GET /api/reviews
 *
 * Returns live review stats and recent reviews computed from on-chain
 * feedback events. Replaces the static review-data.json / recent-reviews.json
 * so the /reviews page updates automatically when ack-feedback posts new
 * transactions.
 *
 * Query params:
 *   - recentLimit: max recent reviews to return (default 20)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAllFeedbackEventsForChain,
  type FeedbackEvent,
} from '@/lib/feedback-cache';
import { SUPPORTED_8004_CHAINS } from '@/config/chain';

export const maxDuration = 30;

const CHAIN_META: Record<
  number,
  { name: string; color: string; explorer: string }
> = {
  1: {
    name: 'Ethereum',
    color: '#627EEA',
    explorer: 'https://etherscan.io/tx',
  },
  2741: {
    name: 'Abstract',
    color: '#00D4AA',
    explorer: 'https://abscan.org/tx',
  },
  8453: { name: 'Base', color: '#0052FF', explorer: 'https://basescan.org/tx' },
  42220: { name: 'Celo', color: '#FCFF52', explorer: 'https://celoscan.io/tx' },
};

// All chains we want review data from
const REVIEW_CHAIN_IDS = [1, 2741, 8453, 42220];

interface AgentInfo {
  name: string;
  tokenId: number;
}

// Simple in-memory agent name cache (survives within a single serverless invocation)
const agentNameCache = new Map<string, { name: string; ts: number }>();
const NAME_CACHE_TTL = 300_000; // 5 minutes

async function resolveAgentName(
  agentId: number,
  chainId: number
): Promise<string> {
  const key = `${chainId}:${agentId}`;
  const cached = agentNameCache.get(key);
  if (cached && Date.now() - cached.ts < NAME_CACHE_TTL) return cached.name;

  try {
    const res = await fetch(
      `https://8004scan.io/api/v1/public/agents/${agentId}/identity?chainId=${chainId}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      const data = await res.json();
      const name = data?.name || data?.handle || `Agent #${agentId}`;
      agentNameCache.set(key, { name, ts: Date.now() });
      return name;
    }
  } catch {
    // Fall through to default
  }
  return `Agent #${agentId}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const recentLimit = parseInt(searchParams.get('recentLimit') || '20', 10);

  try {
    // Fetch feedback from all supported review chains in parallel
    const chainResults = await Promise.allSettled(
      REVIEW_CHAIN_IDS.filter((cid) => SUPPORTED_8004_CHAINS[cid]) // only chains we can actually query
        .map(async (cid) => {
          const events = await getAllFeedbackEventsForChain(cid);
          return { chainId: cid, events };
        })
    );

    // Merge all events
    const allEvents: FeedbackEvent[] = [];
    const chainStats: Record<number, { count: number; senders: Set<string> }> =
      {};

    for (const result of chainResults) {
      if (result.status === 'fulfilled') {
        const { chainId, events } = result.value;
        allEvents.push(...events);
        if (!chainStats[chainId]) {
          chainStats[chainId] = { count: 0, senders: new Set() };
        }
        chainStats[chainId].count += events.length;
        for (const e of events) {
          chainStats[chainId].senders.add(e.sender);
        }
      }
    }

    // Build aggregate chain data
    const chains = REVIEW_CHAIN_IDS.filter(
      (cid) => chainStats[cid]?.count > 0
    ).map((cid) => ({
      id: cid,
      name: CHAIN_META[cid]?.name ?? `Chain ${cid}`,
      color: CHAIN_META[cid]?.color ?? '#888888',
      count: chainStats[cid].count,
      uniqueAgents: chainStats[cid].senders.size,
    }));

    const total = chains.reduce((s, c) => s + c.count, 0);

    // Build byDate aggregation
    const dateMap = new Map<string, Record<string, number>>();
    for (const e of allEvents) {
      // We don't have timestamps directly, but we can group by date if available
      // For now, use a simple block-number-to-date approximation
      // The feedback events don't carry a date field, so we'll skip byDate for
      // live data (the heatmap will use the static data as fallback initially)
    }

    // Build byDate from events - we need block timestamps ideally
    // For now, aggregate what we have and include the static data as baseline
    // The recent reviews are the main real-time component

    // Sort all events newest first (by block number, cross-chain approximate)
    const sorted = [...allEvents].sort(
      (a, b) => parseInt(b.blockNumber) - parseInt(a.blockNumber)
    );

    // Build recent reviews with agent names
    const recentSlice = sorted.slice(0, recentLimit);
    const recentReviews = await Promise.all(
      recentSlice.map(async (e) => {
        const name = await resolveAgentName(e.agentId, e.chainId);
        const rating = parseInt(e.value) || 0;
        const explorer = CHAIN_META[e.chainId]?.explorer ?? '';
        return {
          name,
          chainId: e.chainId,
          chainName: CHAIN_META[e.chainId]?.name ?? `Chain ${e.chainId}`,
          tokenId: e.agentId,
          rating,
          txHash: e.txHash,
          explorerUrl: explorer ? `${explorer}/${e.txHash}` : '',
          review: e.feedbackURI || '',
        };
      })
    );

    return NextResponse.json(
      {
        stats: { total, chains },
        recent: recentReviews,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: `Failed to compute review data: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 502 }
    );
  }
}
