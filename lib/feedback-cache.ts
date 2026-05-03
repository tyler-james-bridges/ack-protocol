/**
 * Shared feedback cache module (multi-chain).
 *
 * Centralizes all on-chain feedback event fetching behind per-chain in-memory
 * caches so that multiple API routes (feedback, discover, reputation) share
 * the same data without redundant RPC calls.
 *
 * Supports Abstract, Base, and Ethereum. Each chain maintains its own
 * independent cache and client instance.
 *
 * SERVERLESS CAVEAT: The in-memory caches reset on every cold start in
 * serverless environments. Vercel Pro's function persistence reduces cold
 * starts but does not eliminate them.
 */

import {
  createPublicClient,
  http,
  numberToHex,
  decodeAbiParameters,
  type Hex,
  type Address,
  type PublicClient,
} from 'viem';
import { SUPPORTED_8004_CHAINS, type ChainConfig } from '@/config/chain';

const REPUTATION_REGISTRY =
  '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63' as const;

const NEW_FEEDBACK_TOPIC =
  '0x6a4a61743519c9d648a14e6493f47dbe3ff1aa29e7785c96c8326a205e58febc' as const;

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
  chainId: number;
}

interface ChainCache {
  events: FeedbackEvent[];
  ts: number;
  toBlock: number;
}

const CACHE_TTL = 120_000; // 2 minutes

// Per-chain clients and caches
const clients: Record<number, PublicClient> = {};
const caches: Record<number, ChainCache | null> = {};

function getClient(chainId: number): PublicClient {
  if (!clients[chainId]) {
    const cfg = SUPPORTED_8004_CHAINS[chainId];
    if (!cfg) throw new Error(`Unsupported chain: ${chainId}`);
    clients[chainId] = createPublicClient({
      chain: (cfg as ChainConfig).chain,
      transport: http((cfg as ChainConfig).rpcUrl),
    });
  }
  return clients[chainId];
}

type RawLog = {
  topics: Hex[];
  data: Hex;
  blockNumber: Hex;
  transactionHash: Hex;
};

function parseLogs(rawLogs: RawLog[], chainId: number): FeedbackEvent[] {
  const events: FeedbackEvent[] = [];
  for (const log of rawLogs) {
    try {
      const blockNum = Number(BigInt(log.blockNumber));
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

      events.push({
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
        chainId,
      });
    } catch {
      // skip malformed events
    }
  }
  return events;
}

/**
 * Fetch all NewFeedback events from a single chain.
 * Results are cached in memory and incrementally updated per chain.
 */
async function fetchChainFeedback(chainId: number): Promise<FeedbackEvent[]> {
  const now = Date.now();
  const cached = caches[chainId];
  if (cached && now - cached.ts < CACHE_TTL) {
    return cached.events;
  }

  const cfg = SUPPORTED_8004_CHAINS[chainId];
  if (!cfg) return [];

  const client = getClient(chainId);
  const fromBlock = cached
    ? cached.toBlock + 1
    : (cfg as ChainConfig).deployBlock;

  const latestHex = (await client.request({
    method: 'eth_blockNumber',
  })) as Hex;
  const latestBlock = Number(BigInt(latestHex));
  const CHUNK = 500_000;

  const rawLogs: RawLog[] = [];
  for (let start = fromBlock; start <= latestBlock; start += CHUNK) {
    const end = Math.min(start + CHUNK - 1, latestBlock);
    const logs = await client.request({
      method: 'eth_getLogs',
      params: [
        {
          address: REPUTATION_REGISTRY,
          topics: [NEW_FEEDBACK_TOPIC],
          fromBlock: numberToHex(BigInt(start)),
          toBlock: numberToHex(BigInt(end)),
        },
      ],
    });
    rawLogs.push(...(logs as RawLog[]));
  }

  const newEvents = parseLogs(rawLogs, chainId);
  let maxBlock = fromBlock;
  for (const log of rawLogs) {
    const bn = Number(BigInt(log.blockNumber));
    if (bn > maxBlock) maxBlock = bn;
  }

  let merged: FeedbackEvent[];
  if (cached && newEvents.length > 0) {
    const seen = new Set(
      cached.events.map((e) => `${e.txHash}:${e.feedbackIndex}`)
    );
    const unique = newEvents.filter(
      (e) => !seen.has(`${e.txHash}:${e.feedbackIndex}`)
    );
    merged = [...cached.events, ...unique];
  } else {
    merged = cached ? cached.events : newEvents;
  }

  caches[chainId] = { events: merged, ts: now, toBlock: maxBlock };
  return merged;
}

/**
 * Fetch feedback events for a specific chain.
 */
export async function getAllFeedbackEventsForChain(
  chainId: number
): Promise<FeedbackEvent[]> {
  return fetchChainFeedback(chainId);
}

/**
 * Fetch all NewFeedback events across all supported chains.
 * Results are merged and sorted by block number (descending, cross-chain
 * ordering is approximate).
 */
export async function getAllFeedbackEvents(): Promise<FeedbackEvent[]> {
  const chainIds = Object.keys(SUPPORTED_8004_CHAINS).map(Number);
  const results = await Promise.all(chainIds.map(fetchChainFeedback));
  const merged = results.flat();
  // Sort newest first (cross-chain block numbers are not directly comparable
  // but this gives a reasonable approximation)
  merged.sort((a, b) => parseInt(b.blockNumber) - parseInt(a.blockNumber));
  return merged;
}

/**
 * Fire-and-forget cache warmup -- call at module scope to pre-populate
 * the feedback cache on cold start without blocking the request.
 */
export function warmupFeedbackCache(): void {
  const chainIds = Object.keys(SUPPORTED_8004_CHAINS).map(Number);
  for (const cid of chainIds) {
    fetchChainFeedback(cid).catch(() => {});
  }
}

/**
 * Get feedback events filtered by agent token ID.
 */
export async function getFeedbackByAgentId(
  agentId: number
): Promise<FeedbackEvent[]> {
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
