import {
  createPublicClient,
  http,
  numberToHex,
  decodeAbiParameters,
  type Hex,
  type Address,
  type PublicClient,
} from 'viem';
import {
  DEFAULT_FEEDBACK_CHAIN_IDS,
  SUPPORTED_8004_CHAINS,
  type ChainConfig,
} from '@/config/chain';
import { readBaseCounts, readBaseHistory } from '@/lib/base-feedback-store';

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
  refreshedAt: number;
  scannedThrough: number;
}

interface ChainReader {
  client: PublicClient;
  cache?: ChainCache;
  refreshing?: Promise<FeedbackEvent[]>;
}

const CACHE_TTL = 120_000;
const readers = new Map<number, ChainReader>();

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
      continue;
    }
  }
  return events;
}

async function fetchChainFeedback(chainId: number): Promise<FeedbackEvent[]> {
  const cfg = SUPPORTED_8004_CHAINS[chainId];
  if (chainId === 8453 || !cfg) return [];

  let reader = readers.get(chainId);
  if (!reader) {
    reader = {
      client: createPublicClient({
        chain: cfg.chain,
        transport: http(cfg.rpcUrl),
      }),
    };
    readers.set(chainId, reader);
  }

  if (reader.cache && Date.now() - reader.cache.refreshedAt < CACHE_TTL) {
    return reader.cache.events;
  }
  if (reader.refreshing) return reader.refreshing;
  reader.refreshing = scanChain(chainId, cfg, reader);
  try {
    return await reader.refreshing;
  } finally {
    delete reader.refreshing;
  }
}

async function scanChain(
  chainId: number,
  cfg: ChainConfig,
  reader: ChainReader
): Promise<FeedbackEvent[]> {
  const { client, cache } = reader;
  const latestHex = (await client.request({
    method: 'eth_blockNumber',
  })) as Hex;
  const latestBlock = Number(BigInt(latestHex));
  const chunkSize = cfg.maxLogRange;
  const coldStart =
    chunkSize <= 10_000 ? latestBlock - 24 * chunkSize + 1 : cfg.deployBlock;
  const scanFrom = Math.max(
    cfg.deployBlock,
    cache ? cache.scannedThrough + 1 : coldStart
  );

  const rawLogs: RawLog[] = [];
  for (let start = scanFrom; start <= latestBlock; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, latestBlock);
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
  const previous = cache?.events ?? [];
  let events = previous;
  if (newEvents.length) {
    const eventKey = (event: FeedbackEvent) =>
      [event.txHash, event.agentId, event.sender, event.feedbackIndex].join(
        ':'
      );
    const seen = new Set(previous.map(eventKey));
    events = previous.concat(
      newEvents.filter((event) => !seen.has(eventKey(event)))
    );
  }
  reader.cache = {
    events,
    refreshedAt: Date.now(),
    scannedThrough: Math.max(latestBlock, cache?.scannedThrough ?? 0),
  };
  return events;
}

export async function getAllFeedbackEventsForChain(
  chainId: number
): Promise<FeedbackEvent[]> {
  return fetchChainFeedback(chainId);
}

export async function getAllFeedbackEvents(
  chainId?: number
): Promise<FeedbackEvent[]> {
  if (chainId === 8453) return [];
  const chainIds =
    chainId !== undefined ? [chainId] : [...DEFAULT_FEEDBACK_CHAIN_IDS];
  const results = await Promise.all(
    chainIds.map((cid) =>
      fetchChainFeedback(cid).catch(() => [] as FeedbackEvent[])
    )
  );
  const merged = results.flat();
  // Sort newest first (cross-chain block numbers are not directly comparable
  // but this gives a reasonable approximation)
  merged.sort((a, b) => parseInt(b.blockNumber) - parseInt(a.blockNumber));
  return merged;
}

export function warmupFeedbackCache(): void {
  const chainIds = Object.keys(SUPPORTED_8004_CHAINS).map(Number);
  for (const cid of chainIds) {
    if (cid === 8453) continue;
    fetchChainFeedback(cid).catch(() => {});
  }
}

export async function getFeedbackByAgentId(
  agentId: number,
  chainId?: number
): Promise<FeedbackEvent[]> {
  if (chainId === 8453) {
    const { events } = await readBaseHistory({ agentId, limit: 500 });
    return events;
  }
  const all =
    chainId !== undefined
      ? await getAllFeedbackEventsForChain(chainId)
      : await getAllFeedbackEvents();
  return all.filter((e) => e.agentId === agentId);
}

export async function getFeedbackCounts(
  chainId?: number
): Promise<Record<number, number>> {
  if (chainId === 8453) {
    const { counts } = await readBaseCounts();
    const record: Record<number, number> = {};
    for (const [agentId, count] of counts) record[agentId] = count;
    return record;
  }
  const all = await getAllFeedbackEvents(chainId);
  const counts: Record<number, number> = {};
  for (const e of all) {
    counts[e.agentId] = (counts[e.agentId] || 0) + 1;
  }
  return counts;
}
