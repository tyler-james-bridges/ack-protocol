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

function isRateLimitError(error: unknown): boolean {
  if (!isRecord(error)) return false;
  if (error.status === 429) return true;
  if ('cause' in error && isRateLimitError(error.cause)) return true;
  const message = typeof error.message === 'string' ? error.message : '';
  return /\b429\b/.test(message) || /rate limit/i.test(message);
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

async function main(): Promise<number> {
  if (process.env.GITHUB_ACTIONS === 'true' && !process.env.DATABASE_URL) {
    console.error('DATABASE_URL is unset');
    return 1;
  }
  const maxChunks = readMaxChunks(process.argv.slice(2));
  const cfg = SUPPORTED_8004_CHAINS[BASE_CHAIN_ID];
  const client = createPublicClient({
    chain: cfg.chain,
    transport: http(process.env.BASE_RPC_URL || cfg.rpcUrl),
  });

  for (let completed = 0; completed < maxChunks; completed += 1) {
    const head = await withBackoff(() => readHead(client));
    const scannedThrough = await readScannedThrough();
    const planned = planNextChunk(scannedThrough, head, cfg.maxLogRange);
    if (!planned) return 0;
    await sleep(REQUEST_GAP_MS);
    const logs = await withBackoff(() => readLogs(client, planned));
    const events = decodeFeedbackLogs(logs);
    await commitChunkToStore({
      fromBlock: planned.fromBlock,
      toBlock: planned.toBlock,
      events,
      observedHeadBlock: head,
    });
    if (planNextChunk(planned.toBlock, head, cfg.maxLogRange) === null)
      return 0;
    if (completed + 1 < maxChunks) await sleep(REQUEST_GAP_MS);
  }
  return 0;
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((error: unknown) => {
    if (isRateLimitError(error)) {
      console.error('Base feedback backfill rate limited');
    } else {
      console.error(publicError(error));
    }
    process.exit(1);
  });
