#!/usr/bin/env npx tsx

import {
  createPublicClient,
  decodeAbiParameters,
  http,
  numberToHex,
  type Hex,
  type PublicClient,
} from 'viem';
import { SUPPORTED_8004_CHAINS } from '../config/chain';
import { planNextChunk } from '../lib/base-feedback';
import {
  commitChunkToStore,
  readScannedThrough,
} from '../lib/base-feedback-store';
import type { StoredFeedback } from '../lib/base-feedback';

const BASE_CHAIN_ID = 8453;
const BASE_ARCHIVE_RPC_URL = 'https://base-rpc.publicnode.com';
const REQUEST_GAP_MS = 300;
const RATE_LIMIT_BACKOFF_MS = [1_000, 2_000, 4_000, 8_000, 16_000];
const REPUTATION_REGISTRY =
  '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63' as const;
const NEW_FEEDBACK_TOPIC =
  '0x6a4a61743519c9d648a14e6493f47dbe3ff1aa29e7785c96c8326a205e58febc' as const;
const DECODE_ERROR = 'feedback log did not decode';

const FEEDBACK_PARAMS = [
  { name: 'feedbackIndex', type: 'uint64' },
  { name: 'value', type: 'int128' },
  { name: 'valueDecimals', type: 'uint8' },
  { name: 'tag1', type: 'string' },
  { name: 'tag2', type: 'string' },
  { name: 'endpoint', type: 'string' },
  { name: 'feedbackURI', type: 'string' },
  { name: 'feedbackHash', type: 'bytes32' },
] as const;

type RpcLog = {
  topics: Hex[];
  data: Hex;
  blockNumber: Hex;
  transactionHash: Hex;
  logIndex: Hex;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function readMaxChunks(argv: string[]): number {
  const flag = '--max-chunks';
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg !== flag && !arg.startsWith(`${flag}=`)) continue;
    const raw = arg === flag ? argv[index + 1] : arg.slice(flag.length + 1);
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0) {
      throw new Error('--max-chunks expects a non-negative integer');
    }
    return value;
  }
  return 600;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function rpcErrorMessage(error: unknown): string {
  if (!isRecord(error)) return '';
  if (typeof error.details === 'string') return error.details;
  if (error.cause) return rpcErrorMessage(error.cause);
  return typeof error.message === 'string' ? error.message.split('\n')[0] : '';
}

function smallerLogRange(error: unknown, rejectedWidth: number): number | null {
  if (rejectedWidth <= 1) return null;
  const message = rpcErrorMessage(error);
  const patterns = [
    /eth_getLogs is limited to (?:a )?([\d,]+) (?:blocks? )?range/i,
    /exceed(?:s|ed)? (?:the )?maximum block range:\s*([\d,]+)/i,
    /ranges over ([\d,]+) blocks are not supported/i,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (!match) continue;
    const limit = Number(match[1].replaceAll(',', ''));
    if (limit > 0 && limit < rejectedWidth) return limit;
    return Math.floor(rejectedWidth / 2);
  }
  if (/\bblock range (?:is )?too (?:large|wide)\b/i.test(message)) {
    return Math.floor(rejectedWidth / 2);
  }
  return null;
}

function isRateLimitError(error: unknown): boolean {
  if (!isRecord(error)) return false;
  if (error.status === 429) return true;
  if ('cause' in error && isRateLimitError(error.cause)) return true;
  return /rate limit|too many requests|request limit reached|\bHTTP 429\b/i.test(
    rpcErrorMessage(error)
  );
}

function publicError(error: unknown): string {
  const message =
    error instanceof Error ? error.message : 'Base feedback backfill failed';
  return message.replace(/https?:\/\/\S+/g, '[rpc]');
}

async function withBackoff<T>(run: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt <= RATE_LIMIT_BACKOFF_MS.length; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      const exhausted = attempt === RATE_LIMIT_BACKOFF_MS.length;
      if (!isRateLimitError(error) || exhausted) throw error;
      await sleep(RATE_LIMIT_BACKOFF_MS[attempt]);
    }
  }
  throw new Error('Base feedback backfill rate limited');
}

function isHex(value: unknown): value is Hex {
  return typeof value === 'string' && value.startsWith('0x');
}

function isRpcLog(value: unknown): value is RpcLog {
  if (!isRecord(value) || !Array.isArray(value.topics)) return false;
  return (
    value.topics.every((topic) => isHex(topic)) &&
    isHex(value.data) &&
    isHex(value.blockNumber) &&
    isHex(value.transactionHash) &&
    isHex(value.logIndex)
  );
}

function decodeText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'bigint') return value.toString();
  throw new Error(DECODE_ERROR);
}

function decodeFeedbackLog(value: unknown): StoredFeedback {
  if (!isRpcLog(value) || value.topics.length < 3) {
    throw new Error(DECODE_ERROR);
  }
  const agentTopic = value.topics[1];
  const senderTopic = value.topics[2];
  if (!agentTopic || !senderTopic) throw new Error(DECODE_ERROR);
  const decoded = decodeAbiParameters(FEEDBACK_PARAMS, value.data);
  return {
    sender: `0x${senderTopic.slice(26)}`.toLowerCase(),
    agentId: Number(BigInt(agentTopic)),
    feedbackIndex: decodeText(decoded[0]),
    value: decodeText(decoded[1]),
    tag1: decodeText(decoded[3]),
    tag2: decodeText(decoded[4]),
    feedbackURI: decodeText(decoded[6]),
    feedbackHash: decodeText(decoded[7]),
    blockNumber: Number(BigInt(value.blockNumber)).toString(),
    txHash: value.transactionHash,
    chainId: BASE_CHAIN_ID,
    logIndex: Number(BigInt(value.logIndex)),
  };
}

function decodeFeedbackLogs(payload: unknown): StoredFeedback[] {
  if (!Array.isArray(payload)) throw new Error(DECODE_ERROR);
  return payload.map((item) => {
    try {
      return decodeFeedbackLog(item);
    } catch (error) {
      if (error instanceof Error && error.message === DECODE_ERROR) throw error;
      throw new Error(DECODE_ERROR);
    }
  });
}

async function readHead(client: PublicClient): Promise<number> {
  const latest = await client.request({ method: 'eth_blockNumber' });
  if (typeof latest !== 'string')
    throw new Error('feedback head did not decode');
  return Number(BigInt(latest));
}

async function readLogs(
  client: PublicClient,
  range: { fromBlock: number; toBlock: number }
): Promise<unknown> {
  return client.request({
    method: 'eth_getLogs',
    params: [
      {
        address: REPUTATION_REGISTRY,
        topics: [NEW_FEEDBACK_TOPIC],
        fromBlock: numberToHex(BigInt(range.fromBlock)),
        toBlock: numberToHex(BigInt(range.toBlock)),
      },
    ],
  });
}

export async function backfillBaseFeedback(maxChunks: number): Promise<void> {
  if (process.env.GITHUB_ACTIONS === 'true' && !process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is unset');
  }
  if (maxChunks === 0) return;
  const cfg = SUPPORTED_8004_CHAINS[BASE_CHAIN_ID];
  const client = createPublicClient({
    chain: cfg.chain,
    transport: http(process.env.BASE_RPC_URL || BASE_ARCHIVE_RPC_URL),
  });
  const start = await readScannedThrough();
  let scannedThrough = start;
  let head = await withBackoff(() => readHead(client));
  let maxLogRange = cfg.maxLogRange;
  let completed = 0;

  while (completed < maxChunks) {
    const planned = planNextChunk(scannedThrough, head, maxLogRange);
    if (!planned) break;
    await sleep(REQUEST_GAP_MS);
    let logs: unknown;
    try {
      logs = await withBackoff(() => readLogs(client, planned));
    } catch (error) {
      const width = planned.toBlock - planned.fromBlock + 1;
      const smaller = smallerLogRange(error, width);
      if (smaller === null) throw error;
      maxLogRange = smaller;
      console.info(
        `RPC rejected ${width} blocks. Retrying from ${planned.fromBlock} with ${smaller} blocks.`
      );
      continue;
    }
    const events = decodeFeedbackLogs(logs);
    await commitChunkToStore({
      ...planned,
      events,
      observedHeadBlock: head,
    });
    scannedThrough = await readScannedThrough();
    if (scannedThrough < planned.toBlock) {
      throw new Error(
        `Base feedback cursor is ${scannedThrough} after committing through ${planned.toBlock}`
      );
    }
    completed += 1;
    if (scannedThrough >= head || completed === maxChunks) break;
    await sleep(REQUEST_GAP_MS);
    head = await withBackoff(() => readHead(client));
  }
  console.info(
    `Base feedback scanned through ${start} -> ${scannedThrough}, observed head ${head}, committed chunks ${completed}`
  );
}

async function main(): Promise<void> {
  await backfillBaseFeedback(readMaxChunks(process.argv.slice(2)));
}

if (typeof require !== 'undefined' && require.main === module) {
  main().catch((error: unknown) => {
    console.error(
      isRateLimitError(error)
        ? 'Base feedback backfill rate limited'
        : publicError(error)
    );
    process.exit(1);
  });
}
