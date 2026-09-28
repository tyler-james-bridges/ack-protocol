import { createReadStream } from 'node:fs';
import {
  open,
  rename,
  appendFile,
  mkdir,
  readFile,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { SUPPORTED_8004_CHAINS } from '@/config/chain';
import { hasDb, getDb } from '@/lib/db';
import {
  commitChunk,
  deriveCoverage,
  feedbackEventKey,
  type Coverage,
  type FeedbackCursor,
  type StoredFeedback,
} from '@/lib/base-feedback';

const BASE_CHAIN_ID = 8453;
const COUNTS_TTL_MS = 120_000;
const HISTORY_LIMIT = 500;
const RECENT_LIMIT = 50;
const INSERT_BATCH = 200;

export type BaseCounts = {
  coverage: Coverage;
  counts: Map<number, number>;
  uniqueSenders: number;
};

export type BaseHistoryQuery = {
  agentId?: number;
  sender?: string;
  limit: number;
};

export type BaseChunkCommit = {
  fromBlock: number;
  toBlock: number;
  events: StoredFeedback[];
  observedHeadBlock: number;
};

type CountsSnapshot = {
  at: number;
  source: string;
  scannedThroughBlock: number;
  updatedAt: number;
  counts: Map<number, number>;
  uniqueSenders: number;
};

let schemaReady = false;
let countsSnapshot: CountsSnapshot | null = null;

export async function readBaseCounts(): Promise<BaseCounts> {
  const cursor = await readCursor();
  const coverage = deriveCoverage(cursor, Date.now());
  if (!cursor) {
    return { coverage, counts: new Map(), uniqueSenders: 0 };
  }
  const source = cacheSource();
  const cached = countsSnapshot;
  if (
    cached &&
    cached.source === source &&
    cached.scannedThroughBlock === cursor.scannedThroughBlock &&
    cached.updatedAt === cursor.updatedAt &&
    Date.now() - cached.at < COUNTS_TTL_MS
  ) {
    return {
      coverage,
      counts: cached.counts,
      uniqueSenders: cached.uniqueSenders,
    };
  }
  const loaded = hasDb() ? await countInDb(cursor) : await countInFile(cursor);
  countsSnapshot = {
    at: Date.now(),
    source,
    scannedThroughBlock: cursor.scannedThroughBlock,
    updatedAt: cursor.updatedAt,
    counts: loaded.counts,
    uniqueSenders: loaded.uniqueSenders,
  };
  return {
    coverage,
    counts: loaded.counts,
    uniqueSenders: loaded.uniqueSenders,
  };
}

export async function readBaseHistory(
  query: BaseHistoryQuery
): Promise<{ coverage: Coverage; events: StoredFeedback[] }> {
  const cursor = await readCursor();
  const coverage = deriveCoverage(cursor, Date.now());
  const limit = boundedLimit(query.limit, HISTORY_LIMIT);
  if (!cursor || limit === 0) return { coverage, events: [] };
  const sender = query.sender?.toLowerCase();
  const events = hasDb()
    ? await historyInDb(cursor, { ...query, sender, limit })
    : await readNewestFromFile(cursor.scannedThroughBlock, {
        agentId: query.agentId,
        sender,
        limit,
      });
  return { coverage, events };
}

export async function readBaseRecent(limit: number): Promise<StoredFeedback[]> {
  const { events } = await readBaseHistory({
    limit: boundedLimit(limit, RECENT_LIMIT),
  });
  return events;
}

export async function readScannedThrough(): Promise<number> {
  const cursor = await readCursor();
  if (cursor) return cursor.scannedThroughBlock;
  return SUPPORTED_8004_CHAINS[BASE_CHAIN_ID].deployBlock - 1;
}

export async function commitChunkToStore(
  chunk: BaseChunkCommit
): Promise<void> {
  if (!chunk.events.every(isStoredFeedback)) {
    throw new Error('feedback chunk did not decode');
  }
  const scannedThrough = await readScannedThrough();
  const prior = {
    scannedThroughBlock: scannedThrough,
    events: [] as StoredFeedback[],
  };
  const probed = commitChunk(prior, {
    fromBlock: chunk.fromBlock,
    toBlock: chunk.toBlock,
    events: chunk.events,
  });
  if (probed === prior) {
    if (chunk.toBlock <= scannedThrough) return;
    throw new Error(
      `base feedback chunk starts at ${chunk.fromBlock}, expected ${scannedThrough + 1}`
    );
  }
  const events = hasDb()
    ? probed.events
    : await dropTailDuplicates(probed.events, chunk.fromBlock);
  if (hasDb()) {
    await insertEvents(events);
    await advanceDbCursor(chunk, scannedThrough);
  } else {
    await appendLogs(events);
    await writeDiskCursor(chunk.toBlock, chunk.observedHeadBlock);
  }
  countsSnapshot = null;
}

function feedbackDir(): string {
  return process.env.BASE_FEEDBACK_DIR || 'data/base-feedback';
}

function cursorPath(): string {
  return path.join(feedbackDir(), 'cursor.json');
}

function logsPath(): string {
  return path.join(feedbackDir(), 'logs.jsonl');
}

function cacheSource(): string {
  return hasDb() ? 'db' : feedbackDir();
}

function boundedLimit(limit: number, max: number): number {
  if (!Number.isFinite(limit)) return max;
  return Math.min(Math.max(Math.floor(limit), 0), max);
}

async function readCursor(): Promise<FeedbackCursor | null> {
  if (hasDb()) return readDbCursor();
  return readDiskCursor();
}

async function readDiskCursor(): Promise<FeedbackCursor | null> {
  let raw: string;
  let mtimeMs: number;
  try {
    const [text, info] = await Promise.all([
      readFile(cursorPath(), 'utf8'),
      stat(cursorPath()),
    ]);
    raw = text;
    mtimeMs = info.mtimeMs;
  } catch (error) {
    if (isEnoent(error)) return null;
    throw error;
  }
  const cursor = parseDiskCursor(raw, mtimeMs);
  if (!cursor) throw new Error('base feedback cursor.json did not decode');
  return cursor;
}

function parseDiskCursor(raw: string, mtimeMs: number): FeedbackCursor | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(value)) return null;
  if (value.chainId !== BASE_CHAIN_ID) return null;
  const nextBlock = asInteger(value.nextBlock);
  if (nextBlock === null) return null;
  const scannedThroughBlock = nextBlock - 1;
  const observedHead =
    value.observedHeadBlock === undefined
      ? scannedThroughBlock
      : asInteger(value.observedHeadBlock);
  if (observedHead === null) return null;
  const updatedAt =
    value.updatedAt === undefined
      ? Math.trunc(mtimeMs)
      : asInteger(value.updatedAt);
  if (updatedAt === null) return null;
  return {
    scannedThroughBlock,
    observedHeadBlock: observedHead,
    updatedAt,
  };
}

async function readDbCursor(): Promise<FeedbackCursor | null> {
  await ensureBaseSchema();
  const sql = getDb();
  const rows = await sql`
    SELECT scanned_through, observed_head, updated_at
    FROM base_feedback_cursor
    WHERE chain_id = ${BASE_CHAIN_ID}
  `;
  const row = rows[0];
  if (!row) return null;
  const scannedThroughBlock = asInteger(row.scanned_through);
  const observedHeadBlock = asInteger(row.observed_head);
  const updatedAt = asInteger(row.updated_at);
  if (
    scannedThroughBlock === null ||
    observedHeadBlock === null ||
    updatedAt === null
  ) {
    throw new Error('base feedback cursor row did not decode');
  }
  return { scannedThroughBlock, observedHeadBlock, updatedAt };
}

async function countInFile(
  cursor: FeedbackCursor
): Promise<{ counts: Map<number, number>; uniqueSenders: number }> {
  const counts = new Map<number, number>();
  const seen = new Set<string>();
  const senders = new Set<string>();
  await forEachLogLine((line) => {
    const event = parseStoredLine(line);
    if (!event || event.chainId !== BASE_CHAIN_ID) return;
    if (Number(event.blockNumber) > cursor.scannedThroughBlock) return;
    const key = feedbackEventKey(event);
    if (seen.has(key)) return;
    seen.add(key);
    counts.set(event.agentId, (counts.get(event.agentId) ?? 0) + 1);
    senders.add(event.sender.toLowerCase());
  });
  return { counts, uniqueSenders: senders.size };
}

async function countInDb(
  cursor: FeedbackCursor
): Promise<{ counts: Map<number, number>; uniqueSenders: number }> {
  await ensureBaseSchema();
  const sql = getDb();
  const rows = await sql`
    SELECT agent_id, COUNT(*)::int AS count
    FROM base_feedback_event
    WHERE chain_id = ${BASE_CHAIN_ID}
      AND block_number <= ${cursor.scannedThroughBlock}
    GROUP BY agent_id
  `;
  const senderRows = await sql`
    SELECT COUNT(DISTINCT sender)::int AS unique_senders
    FROM base_feedback_event
    WHERE chain_id = ${BASE_CHAIN_ID}
      AND block_number <= ${cursor.scannedThroughBlock}
  `;
  const counts = new Map<number, number>();
  for (const row of rows) {
    const agentId = asInteger(row.agent_id);
    const count = asInteger(row.count);
    if (agentId === null || count === null) continue;
    counts.set(agentId, count);
  }
  return {
    counts,
    uniqueSenders: asInteger(senderRows[0]?.unique_senders) ?? 0,
  };
}

async function historyInDb(
  cursor: FeedbackCursor,
  query: { agentId?: number; sender?: string; limit: number }
): Promise<StoredFeedback[]> {
  await ensureBaseSchema();
  const sql = getDb();
  const agentId = query.agentId ?? null;
  const sender = query.sender ?? null;
  const rows = await sql`
    SELECT chain_id, agent_id, sender, feedback_index, value, tag1, tag2,
           feedback_uri, feedback_hash, block_number, tx_hash, log_index
    FROM base_feedback_event
    WHERE chain_id = ${BASE_CHAIN_ID}
      AND block_number <= ${cursor.scannedThroughBlock}
      AND (${agentId}::int IS NULL OR agent_id = ${agentId})
      AND (${sender}::text IS NULL OR sender = ${sender})
    ORDER BY block_number DESC, log_index DESC
    LIMIT ${query.limit}
  `;
  const events: StoredFeedback[] = [];
  for (const row of rows) {
    const event = rowToEvent(row);
    if (event) events.push(event);
  }
  return events;
}

async function readNewestFromFile(
  scannedThrough: number,
  query: { agentId?: number; sender?: string; limit: number }
): Promise<StoredFeedback[]> {
  const found: StoredFeedback[] = [];
  const seen = new Set<string>();
  await readLinesBackward(logsPath(), (line) => {
    const event = parseStoredLine(line);
    if (!event || event.chainId !== BASE_CHAIN_ID) return true;
    if (Number(event.blockNumber) > scannedThrough) return true;
    if (query.agentId !== undefined && event.agentId !== query.agentId)
      return true;
    if (query.sender && event.sender.toLowerCase() !== query.sender)
      return true;
    const key = feedbackEventKey(event);
    if (seen.has(key)) return true;
    seen.add(key);
    found.push(event);
    return found.length < query.limit;
  });
  found.sort((a, b) => {
    const blockDelta = Number(b.blockNumber) - Number(a.blockNumber);
    if (blockDelta !== 0) return blockDelta;
    return b.logIndex - a.logIndex;
  });
  return found;
}

async function dropTailDuplicates(
  events: StoredFeedback[],
  fromBlock: number
): Promise<StoredFeedback[]> {
  if (events.length === 0) return events;
  const keys = await tailKeys(fromBlock);
  return events.filter((event) => !keys.has(feedbackEventKey(event)));
}

async function tailKeys(fromBlock: number): Promise<Set<string>> {
  const keys = new Set<string>();
  await readLinesBackward(logsPath(), (line) => {
    const event = parseStoredLine(line);
    if (!event) return true;
    if (Number(event.blockNumber) < fromBlock) return false;
    keys.add(feedbackEventKey(event));
    return true;
  });
  return keys;
}

async function appendLogs(events: StoredFeedback[]): Promise<void> {
  if (events.length === 0) return;
  await mkdir(feedbackDir(), { recursive: true });
  const file = logsPath();
  let prefix = '';
  try {
    const info = await stat(file);
    if (info.size > 0) {
      const handle = await open(file, 'r');
      try {
        const byte = Buffer.alloc(1);
        await handle.read(byte, 0, 1, info.size - 1);
        if (byte.toString() !== '\n') prefix = '\n';
      } finally {
        await handle.close();
      }
    }
  } catch (error) {
    if (!isEnoent(error)) throw error;
  }
  const body = events
    .map((event) => JSON.stringify(serializeEvent(event)))
    .join('\n');
  await appendFile(file, `${prefix}${body}\n`, 'utf8');
}

async function writeDiskCursor(
  scannedThroughBlock: number,
  observedHeadBlock: number
): Promise<void> {
  await mkdir(feedbackDir(), { recursive: true });
  const directory = feedbackDir();
  const target = cursorPath();
  const temp = path.join(directory, `.cursor.${process.pid}.json.tmp`);
  const payload = {
    chainId: BASE_CHAIN_ID,
    fromBlock: SUPPORTED_8004_CHAINS[BASE_CHAIN_ID].deployBlock,
    nextBlock: scannedThroughBlock + 1,
    observedHeadBlock,
    updatedAt: Date.now(),
  };
  await writeFile(temp, JSON.stringify(payload), 'utf8');
  try {
    await rename(temp, target);
  } catch (error) {
    await unlink(temp).catch(() => undefined);
    throw error;
  }
}

async function insertEvents(events: StoredFeedback[]): Promise<void> {
  if (events.length === 0) return;
  await ensureBaseSchema();
  const sql = getDb();
  for (let index = 0; index < events.length; index += INSERT_BATCH) {
    const payload = JSON.stringify(
      events.slice(index, index + INSERT_BATCH).map(eventToRow)
    );
    await sql.query(
      `INSERT INTO base_feedback_event (
         chain_id, agent_id, sender, feedback_index, value, tag1, tag2,
         feedback_uri, feedback_hash, block_number, tx_hash, log_index
       )
       SELECT chain_id, agent_id, sender, feedback_index, value, tag1, tag2,
              feedback_uri, feedback_hash, block_number, tx_hash, log_index
       FROM jsonb_to_recordset($1::jsonb) AS x(
         chain_id int,
         agent_id int,
         sender text,
         feedback_index text,
         value text,
         tag1 text,
         tag2 text,
         feedback_uri text,
         feedback_hash text,
         block_number bigint,
         tx_hash text,
         log_index int
       )
       ON CONFLICT (chain_id, tx_hash, log_index) DO NOTHING`,
      [payload]
    );
  }
}

async function advanceDbCursor(
  chunk: BaseChunkCommit,
  scannedThrough: number
): Promise<void> {
  await ensureBaseSchema();
  const sql = getDb();
  const updatedAt = Date.now();
  await sql`
    INSERT INTO base_feedback_cursor (
      chain_id, scanned_through, observed_head, updated_at
    )
    VALUES (
      ${BASE_CHAIN_ID},
      ${chunk.toBlock},
      ${chunk.observedHeadBlock},
      ${updatedAt}
    )
    ON CONFLICT (chain_id) DO UPDATE
    SET scanned_through = EXCLUDED.scanned_through,
        observed_head = EXCLUDED.observed_head,
        updated_at = EXCLUDED.updated_at
    WHERE base_feedback_cursor.scanned_through = ${scannedThrough}
  `;
}

async function ensureBaseSchema(): Promise<void> {
  if (schemaReady) return;
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS base_feedback_event (
      chain_id INTEGER NOT NULL,
      agent_id INTEGER NOT NULL,
      sender TEXT NOT NULL,
      feedback_index TEXT NOT NULL,
      value TEXT NOT NULL,
      tag1 TEXT NOT NULL,
      tag2 TEXT NOT NULL,
      feedback_uri TEXT NOT NULL,
      feedback_hash TEXT NOT NULL,
      block_number BIGINT NOT NULL,
      tx_hash TEXT NOT NULL,
      log_index INTEGER NOT NULL,
      PRIMARY KEY (chain_id, tx_hash, log_index)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS base_feedback_cursor (
      chain_id INTEGER PRIMARY KEY,
      scanned_through BIGINT NOT NULL,
      observed_head BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS base_feedback_event_block
    ON base_feedback_event (chain_id, block_number)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS base_feedback_event_agent_block
    ON base_feedback_event (chain_id, agent_id, block_number)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS base_feedback_event_sender_block
    ON base_feedback_event (chain_id, sender, block_number)
  `;
  schemaReady = true;
}

function eventToRow(event: StoredFeedback): Record<string, number | string> {
  return {
    chain_id: event.chainId,
    agent_id: event.agentId,
    sender: event.sender,
    feedback_index: event.feedbackIndex,
    value: event.value,
    tag1: event.tag1,
    tag2: event.tag2,
    feedback_uri: event.feedbackURI,
    feedback_hash: event.feedbackHash,
    block_number: Number(event.blockNumber),
    tx_hash: event.txHash,
    log_index: event.logIndex,
  };
}

function serializeEvent(event: StoredFeedback): StoredFeedback {
  return {
    chainId: event.chainId,
    agentId: event.agentId,
    sender: event.sender,
    feedbackIndex: event.feedbackIndex,
    value: event.value,
    tag1: event.tag1,
    tag2: event.tag2,
    feedbackURI: event.feedbackURI,
    feedbackHash: event.feedbackHash,
    blockNumber: event.blockNumber,
    txHash: event.txHash,
    logIndex: event.logIndex,
  };
}

function rowToEvent(row: Record<string, unknown>): StoredFeedback | null {
  return parseStoredLine(
    JSON.stringify({
      chainId: row.chain_id,
      agentId: row.agent_id,
      sender: row.sender,
      feedbackIndex: row.feedback_index,
      value: row.value,
      tag1: row.tag1,
      tag2: row.tag2,
      feedbackURI: row.feedback_uri,
      feedbackHash: row.feedback_hash,
      blockNumber: row.block_number,
      txHash: row.tx_hash,
      logIndex: row.log_index,
    })
  );
}

async function forEachLogLine(onLine: (line: string) => void): Promise<void> {
  const file = logsPath();
  try {
    await stat(file);
  } catch (error) {
    if (isEnoent(error)) return;
    throw error;
  }
  const stream = createReadStream(file, { encoding: 'utf8' });
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  try {
    for await (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) onLine(trimmed);
    }
  } finally {
    lines.close();
  }
}

async function readLinesBackward(
  file: string,
  onLine: (line: string) => boolean
): Promise<void> {
  let handle: FileHandle;
  try {
    handle = await open(file, 'r');
  } catch (error) {
    if (isEnoent(error)) return;
    throw error;
  }
  try {
    const size = (await handle.stat()).size;
    if (size === 0) return;
    const chunkSize = 64 * 1024;
    let position = size;
    let pending = Buffer.alloc(0);
    while (position > 0) {
      const readSize = Math.min(chunkSize, position);
      position -= readSize;
      const buffer = Buffer.alloc(readSize);
      const { bytesRead } = await handle.read(buffer, 0, readSize, position);
      const combined = Buffer.concat([buffer.subarray(0, bytesRead), pending]);
      const segments = splitLines(combined);
      if (position > 0) {
        const head = segments.shift();
        pending = head ? Buffer.from(head) : Buffer.alloc(0);
      } else {
        pending = Buffer.alloc(0);
      }
      for (let index = segments.length - 1; index >= 0; index -= 1) {
        const line = segments[index].toString('utf8').trim();
        if (!line) continue;
        if (!onLine(line)) return;
      }
    }
  } finally {
    await handle.close();
  }
}

function splitLines(buffer: Buffer): Buffer[] {
  const segments: Buffer[] = [];
  let start = 0;
  for (let index = 0; index < buffer.length; index += 1) {
    if (buffer[index] !== 0x0a) continue;
    segments.push(buffer.subarray(start, index));
    start = index + 1;
  }
  segments.push(buffer.subarray(start));
  return segments;
}

function parseStoredLine(line: string): StoredFeedback | null {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return null;
  }
  if (!isRecord(value)) return null;
  const chainId = asInteger(value.chainId);
  const agentId = asInteger(value.agentId);
  const logIndex = asInteger(value.logIndex);
  const blockNumber = blockNumberString(value.blockNumber);
  if (
    chainId === null ||
    agentId === null ||
    logIndex === null ||
    blockNumber === null ||
    typeof value.sender !== 'string' ||
    typeof value.feedbackIndex !== 'string' ||
    typeof value.value !== 'string' ||
    typeof value.tag1 !== 'string' ||
    typeof value.tag2 !== 'string' ||
    typeof value.feedbackURI !== 'string' ||
    typeof value.feedbackHash !== 'string' ||
    typeof value.txHash !== 'string'
  ) {
    return null;
  }
  return {
    chainId,
    agentId,
    sender: value.sender,
    feedbackIndex: value.feedbackIndex,
    value: value.value,
    tag1: value.tag1,
    tag2: value.tag2,
    feedbackURI: value.feedbackURI,
    feedbackHash: value.feedbackHash,
    blockNumber,
    txHash: value.txHash,
    logIndex,
  };
}

function isStoredFeedback(value: unknown): value is StoredFeedback {
  if (!isRecord(value)) return false;
  return (
    value.chainId === BASE_CHAIN_ID &&
    typeof value.agentId === 'number' &&
    Number.isInteger(value.agentId) &&
    typeof value.sender === 'string' &&
    typeof value.feedbackIndex === 'string' &&
    typeof value.value === 'string' &&
    typeof value.tag1 === 'string' &&
    typeof value.tag2 === 'string' &&
    typeof value.feedbackURI === 'string' &&
    typeof value.feedbackHash === 'string' &&
    typeof value.blockNumber === 'string' &&
    Number.isInteger(Number(value.blockNumber)) &&
    typeof value.txHash === 'string' &&
    typeof value.logIndex === 'number' &&
    Number.isInteger(value.logIndex)
  );
}

function blockNumberString(value: unknown): string | null {
  const parsed = asInteger(value);
  if (parsed === null) return null;
  return String(parsed);
}

function asInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value;
  if (typeof value === 'bigint' && value <= BigInt(Number.MAX_SAFE_INTEGER)) {
    return Number(value);
  }
  if (typeof value === 'string' && /^-?\d+$/.test(value)) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed)) return parsed;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEnoent(error: unknown): boolean {
  return isRecord(error) && error.code === 'ENOENT';
}
