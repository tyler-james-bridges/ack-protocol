import { NextRequest, NextResponse } from 'next/server';
import {
  createPublicClient,
  http,
  numberToHex,
  padHex,
  decodeAbiParameters,
  type Hex,
  type Address,
} from 'viem';
import { abstract } from 'viem/chains';

const REPUTATION_REGISTRY =
  '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63' as const;

const NEW_FEEDBACK_TOPIC =
  '0x6a4a61743519c9d648a14e6493f47dbe3ff1aa29e7785c96c8326a205e58febc' as const;

const client = createPublicClient({ chain: abstract, transport: http() });

// --- In-memory cache ---
interface FeedbackEvent {
  sender: string;
  agentId: number;
  feedbackIndex: string;
  value: string;
  tag1: string;
  tag2: string;
  feedbackURI: string;
  feedbackHash: string;
  blockNumber: string;
  txHash: string;
}

let allEventsCache: { events: FeedbackEvent[]; ts: number; toBlock: number } | null = null;
const CACHE_TTL = 60_000; // 1 minute

// Contract deployed around block 39860000
const DEPLOY_BLOCK = 39_000_000;

async function getAllFeedbackEvents(): Promise<FeedbackEvent[]> {
  const now = Date.now();
  if (allEventsCache && now - allEventsCache.ts < CACHE_TTL) {
    return allEventsCache.events;
  }

  // Fetch from last cached block or deploy block
  const fromBlock = allEventsCache ? allEventsCache.toBlock + 1 : DEPLOY_BLOCK;

  const logs = await client.request({
    method: 'eth_getLogs',
    params: [
      {
        address: REPUTATION_REGISTRY,
        topics: [NEW_FEEDBACK_TOPIC],
        fromBlock: numberToHex(BigInt(fromBlock)),
        toBlock: 'latest',
      },
    ],
  });

  const rawLogs = logs as Array<{
    topics: Hex[];
    data: Hex;
    blockNumber: Hex;
    transactionHash: Hex;
  }>;

  const newEvents: FeedbackEvent[] = [];
  let maxBlock = fromBlock;

  for (const log of rawLogs) {
    const blockNum = Number(BigInt(log.blockNumber));
    if (blockNum > maxBlock) maxBlock = blockNum;

    try {
      const agentId = Number(BigInt(log.topics[1]));
      const sender = ('0x' + log.topics[2].slice(26)) as Address;

      const decoded = decodeAbiParameters(
        [
          { name: 'feedbackIndex', type: 'uint64' },
          { name: 'value', type: 'int128' },
          { name: 'valueDecimals', type: 'uint8' },
          { name: 'tag1', type: 'string' },
          { name: 'tag2', type: 'string' },
          { name: 'endpoint', type: 'string' },
          { name: 'feedbackURI', type: 'string' },
          { name: 'feedbackHash', type: 'bytes32' },
        ],
        log.data
      );

      newEvents.push({
        sender: sender.toLowerCase(),
        agentId,
        feedbackIndex: decoded[0].toString(),
        value: decoded[1].toString(),
        tag1: decoded[3],
        tag2: decoded[4],
        feedbackURI: decoded[6],
        feedbackHash: decoded[7] as string,
        blockNumber: blockNum.toString(),
        txHash: log.transactionHash,
      });
    } catch {
      // skip malformed events
    }
  }

  // Merge with existing cache
  const merged = allEventsCache
    ? [...allEventsCache.events, ...newEvents]
    : newEvents;

  allEventsCache = { events: merged, ts: now, toBlock: maxBlock };
  return merged;
}

/**
 * GET /api/feedback
 *
 * Query params:
 *   - agentId: filter by agent token ID
 *   - sender: filter by sender address (lowercase)
 *   - limit: max results (default 100)
 *   - counts: if "true", return only { agentId: count } map
 *
 * All feedback events are cached server-side. One RPC call per minute max.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const agentIdParam = searchParams.get('agentId');
  const senderParam = searchParams.get('sender');
  const countsOnly = searchParams.get('counts') === 'true';
  const limitParam = parseInt(searchParams.get('limit') || '200', 10);

  try {
    const all = await getAllFeedbackEvents();

    if (countsOnly) {
      // Return agentId -> count map
      const counts: Record<number, number> = {};
      for (const e of all) {
        counts[e.agentId] = (counts[e.agentId] || 0) + 1;
      }
      return NextResponse.json(counts, {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
      });
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

    // Sort newest first
    filtered = filtered
      .sort((a, b) => parseInt(b.blockNumber) - parseInt(a.blockNumber))
      .slice(0, limitParam);

    return NextResponse.json({ events: filtered, total: filtered.length }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to fetch feedback: ${error instanceof Error ? error.message : String(error)}` },
      { status: 502 }
    );
  }
}
