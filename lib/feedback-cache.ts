/**
 * Shared feedback cache module.
 *
 * Centralizes all on-chain feedback event fetching behind a single in-memory
 * cache so that multiple API routes (feedback, discover, reputation) share
 * the same data without redundant RPC calls.
 *
 * SERVERLESS CAVEAT: The in-memory cache resets on every cold start in
 * serverless environments. Vercel Pro's function persistence reduces cold
 * starts but does not eliminate them. See the comment block in
 * /app/api/feedback/route.ts for details.
 */

import {
  createPublicClient,
  http,
  numberToHex,
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

export interface FeedbackEvent {
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

/**
 * Fetch all NewFeedback events from the ReputationRegistry contract.
 * Results are cached in memory and incrementally updated.
 */
export async function getAllFeedbackEvents(): Promise<FeedbackEvent[]> {
  const now = Date.now();
  if (allEventsCache && now - allEventsCache.ts < CACHE_TTL) {
    return allEventsCache.events;
  }

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

  const merged = allEventsCache
    ? [...allEventsCache.events, ...newEvents]
    : newEvents;

  allEventsCache = { events: merged, ts: now, toBlock: maxBlock };
  return merged;
}

/**
 * Get feedback events filtered by agent token ID.
 */
export async function getFeedbackByAgentId(agentId: number): Promise<FeedbackEvent[]> {
  const all = await getAllFeedbackEvents();
  return all.filter((e) => e.agentId === agentId);
}

/**
 * Get a map of agentId -> feedback count for all agents.
 */
export async function getFeedbackCounts(): Promise<Record<number, number>> {
  const all = await getAllFeedbackEvents();
  const counts: Record<number, number> = {};
  for (const e of all) {
    counts[e.agentId] = (counts[e.agentId] || 0) + 1;
  }
  return counts;
}
