import { SUPPORTED_8004_CHAINS } from '@/config/chain';
import type { FeedbackEvent } from '@/lib/feedback-cache';

const BASE_CHAIN_ID = 8453;
const COVERAGE_BLOCK_SLACK = 4000;
const COVERAGE_FRESHNESS_MS = 2 * 60 * 60 * 1000;

export type Coverage =
  | { status: 'absent' }
  | {
      status: 'partial' | 'complete';
      deployBlock: number;
      scannedThroughBlock: number;
      observedHeadBlock: number;
      updatedAt: number;
    };

export type StoredFeedback = FeedbackEvent & { logIndex: number };

export type FeedbackCursor = {
  scannedThroughBlock: number;
  observedHeadBlock: number;
  updatedAt: number;
};

export type ChunkState = {
  scannedThroughBlock: number;
  events: StoredFeedback[];
};

export type FeedbackChunk = {
  fromBlock: number;
  toBlock: number;
  events: StoredFeedback[];
};

type ChunkDisposition = 'replay' | 'hole' | 'append';

export function planNextChunk(
  scannedThroughBlock: number,
  headBlock: number,
  maxLogRange: number
): { fromBlock: number; toBlock: number } | null {
  if (scannedThroughBlock >= headBlock) return null;
  const fromBlock = scannedThroughBlock + 1;
  const toBlock = Math.min(fromBlock + maxLogRange - 1, headBlock);
  return { fromBlock, toBlock };
}

export function deriveCoverage(
  cursor: FeedbackCursor | null,
  now: number
): Coverage {
  if (cursor === null) return { status: 'absent' };
  const status = coverageStatus(cursor, now);
  return {
    status,
    deployBlock: SUPPORTED_8004_CHAINS[BASE_CHAIN_ID].deployBlock,
    scannedThroughBlock: cursor.scannedThroughBlock,
    observedHeadBlock: cursor.observedHeadBlock,
    updatedAt: cursor.updatedAt,
  };
}

export function commitChunk(
  state: ChunkState,
  chunk: FeedbackChunk
): ChunkState {
  const kind = disposition(state, chunk);
  switch (kind) {
    case 'replay':
    case 'hole':
      return state;
    case 'append':
      return appendChunk(state, chunk);
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

export function countsByAgent(
  events: { chainId: number; agentId: number }[]
): Map<number, number> {
  const counts = new Map<number, number>();
  for (const event of events) {
    if (event.chainId !== BASE_CHAIN_ID) continue;
    counts.set(event.agentId, (counts.get(event.agentId) ?? 0) + 1);
  }
  return counts;
}

export function feedbackEventKey(event: {
  chainId: number;
  txHash: string;
  logIndex: number;
}): string {
  return `${event.chainId}:${event.txHash}:${event.logIndex}`;
}

function coverageStatus(
  cursor: FeedbackCursor,
  now: number
): 'partial' | 'complete' {
  const fresh = now - cursor.updatedAt <= COVERAGE_FRESHNESS_MS;
  const caughtUp =
    cursor.scannedThroughBlock >=
    cursor.observedHeadBlock - COVERAGE_BLOCK_SLACK;
  if (fresh && caughtUp) return 'complete';
  return 'partial';
}

function disposition(
  state: ChunkState,
  chunk: FeedbackChunk
): ChunkDisposition {
  if (chunk.toBlock <= state.scannedThroughBlock) return 'replay';
  if (chunk.fromBlock !== state.scannedThroughBlock + 1) return 'hole';
  return 'append';
}

function appendChunk(state: ChunkState, chunk: FeedbackChunk): ChunkState {
  const seen = new Set(state.events.map((event) => feedbackEventKey(event)));
  const appended: StoredFeedback[] = [];
  for (const event of chunk.events) {
    const key = feedbackEventKey(event);
    if (seen.has(key)) continue;
    seen.add(key);
    appended.push(event);
  }
  return {
    scannedThroughBlock: chunk.toBlock,
    events:
      appended.length === 0 ? state.events : [...state.events, ...appended],
  };
}
