import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { text } from 'node:stream/consumers';
import {
  encodeAbiParameters,
  encodeEventTopics,
  numberToHex,
  parseAbiParameters,
  zeroAddress,
  zeroHash,
} from 'viem';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { REPUTATION_REGISTRY_ABI } from '@/config/abi';
import * as store from '@/lib/base-feedback-store';
import { backfillBaseFeedback } from '@/scripts/backfill-base-feedback';

const start = 52_197_274;
const head = start + 570;
const originalCursor = { chainId: 8453, nextBlock: start };
const eventBlock = start + 250;
const feedbackLog = {
  blockNumber: numberToHex(eventBlock),
  transactionHash: zeroHash,
  logIndex: '0x1',
  topics: encodeEventTopics({
    abi: REPUTATION_REGISTRY_ABI,
    eventName: 'NewFeedback',
    args: {
      agentId: BigInt(7),
      clientAddress: zeroAddress,
      indexedTag1: 'kudos',
    },
  }),
  data: encodeAbiParameters(
    parseAbiParameters(
      'uint64,int128,uint8,string,string,string,string,bytes32'
    ),
    [BigInt(1), BigInt(5), 0, 'kudos', '', '', '', zeroHash]
  ),
};

type RpcReply =
  | { result: unknown }
  | { error: { code: number; message: string } };
const getLogs = vi.fn<(from: number, to: number) => RpcReply>();
let server: Server;
let archive: string;

beforeEach(async () => {
  getLogs.mockReset();
  archive = await mkdtemp(path.join(tmpdir(), 'base-feedback-'));
  await writeFile(
    path.join(archive, 'cursor.json'),
    JSON.stringify(originalCursor)
  );
  vi.stubEnv('GITHUB_ACTIONS', '');
  vi.stubEnv('DATABASE_URL', '');
  vi.stubEnv('BASE_FEEDBACK_DIR', archive);
  server = createServer(async (request, response) => {
    const { id, method, params } = JSON.parse(await text(request));
    let reply: RpcReply;
    if (method === 'eth_blockNumber') {
      reply = { result: numberToHex(head) };
    } else if (method === 'eth_getLogs') {
      const [{ fromBlock, toBlock }] = params;
      reply = getLogs(Number(fromBlock), Number(toBlock));
    } else {
      reply = { error: { code: -32601, message: 'unknown method' } };
    }
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ jsonrpc: '2.0', id, ...reply }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('missing port');
  vi.stubEnv('BASE_RPC_URL', `http://127.0.0.1:${address.port}`);
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await rm(archive, { recursive: true, force: true });
});

async function readCursor() {
  return JSON.parse(await readFile(path.join(archive, 'cursor.json'), 'utf8'));
}

it('resumes at the provider limit, archives feedback, and catches up across runs', async () => {
  getLogs.mockImplementation((from, to) => {
    if (to - from + 1 > 250) {
      return {
        error: {
          code: -32602,
          message: 'eth_getLogs is limited to a 250 range',
        },
      };
    }
    return {
      result: from <= eventBlock && eventBlock <= to ? [feedbackLog] : [],
    };
  });

  await backfillBaseFeedback(2);
  expect(getLogs.mock.calls).toEqual([
    [start, start + 499],
    [start, start + 249],
    [start + 250, start + 499],
  ]);
  expect(await readCursor()).toMatchObject({
    nextBlock: start + 500,
    observedHeadBlock: head,
  });
  const logs = await readFile(path.join(archive, 'logs.jsonl'), 'utf8');
  expect(JSON.parse(logs)).toMatchObject({
    agentId: 7,
    tag1: 'kudos',
    blockNumber: String(eventBlock),
  });

  getLogs.mockClear();
  await backfillBaseFeedback(2);
  expect(getLogs.mock.calls).toEqual([[start + 500, head]]);
  expect(await readCursor()).toMatchObject({ nextBlock: head + 1 });
  await backfillBaseFeedback(1);
  expect(getLogs).toHaveBeenCalledTimes(1);
});

it.each([
  [
    'invalid filter',
    { error: { code: -32602, message: 'invalid log filter' } },
  ],
  ['malformed log', { result: [{}] }],
] as const)(
  'preserves the checkpoint after an error (%s)',
  async (_name, reply) => {
    getLogs.mockReturnValueOnce({ result: [] }).mockReturnValue(reply);
    await expect(backfillBaseFeedback(2)).rejects.toThrow();
    expect(getLogs.mock.calls).toEqual([
      [start, start + 499],
      [start + 500, head],
    ]);
    expect(await readCursor()).toMatchObject({ nextBlock: start + 500 });
  }
);

it('retries the same range when the provider reports a request limit', async () => {
  getLogs
    .mockReturnValueOnce({
      error: { code: -32011, message: 'request limit reached' },
    })
    .mockReturnValue({ result: [] });
  await backfillBaseFeedback(1);
  expect(getLogs.mock.calls).toEqual([
    [start, start + 499],
    [start, start + 499],
  ]);
  expect(await readCursor()).toMatchObject({ nextBlock: start + 500 });
});

it('fails if a store write returns without advancing the persisted cursor', async () => {
  getLogs.mockReturnValue({ result: [] });
  vi.spyOn(store, 'commitChunkToStore').mockResolvedValue(undefined);
  await expect(backfillBaseFeedback(1)).rejects.toThrow(/cursor/i);
  expect(await readCursor()).toEqual(originalCursor);
});
