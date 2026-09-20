/**
 * Shared query helpers for the ACK kudos ERC-8257 tool.
 *
 * Reuses existing stores and caches. Does not change the public REST
 * routes this tool wraps.
 */

import {
  createPublicClient,
  decodeAbiParameters,
  http,
  isAddress,
  type Hex,
  type PublicClient,
} from 'viem';
import {
  DEFAULT_8004_CHAIN_ID,
  getChainConfig,
  resolveChainId,
} from '@/config/chain';
import { REPUTATION_REGISTRY_ADDRESS } from '@/config/contract';
import { getDb, ensureMigrations, hasDb } from '@/lib/db';
import {
  getAllFeedbackEvents,
  getAllFeedbackEventsForChain,
  type FeedbackEvent,
} from '@/lib/feedback-cache';
import { getStreakForAddress, type StreakData } from '@/lib/streaks';
import { getTip, tipToJSON, type TipRecordJSON } from '@/lib/tip-store';
import { getVouches, type PendingVouch } from '@/lib/vouch-store';

const NEW_FEEDBACK_TOPIC =
  '0x6a4a61743519c9d648a14e6493f47dbe3ff1aa29e7785c96c8326a205e58febc' as const;

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;

const clients = new Map<number, PublicClient>();

function getPublicClient(
  chainId: number = DEFAULT_8004_CHAIN_ID
): PublicClient {
  const cfg = getChainConfig(chainId);
  const existing = clients.get(cfg.chain.id);
  if (existing) return existing;
  const client = createPublicClient({
    chain: cfg.chain,
    transport: http(cfg.rpcUrl),
  });
  clients.set(cfg.chain.id, client);
  return client;
}

export function isValidAddress(value: string): boolean {
  return ADDRESS_RE.test(value) && isAddress(value);
}

export function isValidTxHash(value: string): boolean {
  return TX_HASH_RE.test(value);
}

export function parseKudosMessage(feedbackURI: string): string | null {
  try {
    if (feedbackURI.startsWith('data:application/json;base64,')) {
      const json = Buffer.from(
        feedbackURI.replace('data:application/json;base64,', ''),
        'base64'
      ).toString('utf-8');
      const payload = JSON.parse(json) as {
        reasoning?: string;
        message?: string;
      };
      return payload.reasoning || payload.message || null;
    }
    if (feedbackURI.startsWith('data:,')) {
      const decoded = decodeURIComponent(feedbackURI.slice(6));
      if (decoded.startsWith('{')) {
        const payload = JSON.parse(decoded) as {
          reasoning?: string;
          message?: string;
          category?: string;
          from?: string;
          source?: string;
        };
        return payload.reasoning || payload.message || null;
      }
      return decoded || null;
    }
    if (feedbackURI.startsWith('{')) {
      const payload = JSON.parse(feedbackURI) as {
        reasoning?: string;
        message?: string;
      };
      return payload.reasoning || payload.message || null;
    }
  } catch {
    // ignore malformed URIs
  }
  return null;
}

export interface KudosFeedItem {
  txHash: string;
  agentId: number;
  sender: string;
  tag1: string;
  tag2: string;
  category: string;
  message: string | null;
  feedbackURI: string;
  blockNumber: string;
  chainId: number;
}

export interface KudosFeedFilters {
  agentId?: number;
  sender?: string;
  handle?: string;
  category?: string;
  chainId?: number;
  limit?: number;
}

export async function queryKudosFeed(
  filters: KudosFeedFilters = {}
): Promise<{ items: KudosFeedItem[]; total: number }> {
  const limit = Math.min(Math.max(filters.limit ?? 20, 1), 50);
  const targetChain = resolveChainId(filters.chainId);
  const all = targetChain
    ? await getAllFeedbackEventsForChain(targetChain)
    : await getAllFeedbackEvents();

  let filtered: FeedbackEvent[] = all;

  if (filters.agentId !== undefined) {
    filtered = filtered.filter((e) => e.agentId === filters.agentId);
  }

  if (filters.sender) {
    const addr = filters.sender.toLowerCase();
    filtered = filtered.filter((e) => e.sender === addr);
  }

  if (filters.handle) {
    const tag2Match = `x:${filters.handle.toLowerCase()}`;
    filtered = filtered.filter(
      (e) => e.tag1 === 'proxy' && e.tag2 === tag2Match
    );
  }

  if (filters.category) {
    const category = filters.category.toLowerCase();
    filtered = filtered.filter((e) => e.tag2.toLowerCase() === category);
  }

  const items = filtered
    .sort((a, b) => parseInt(b.blockNumber, 10) - parseInt(a.blockNumber, 10))
    .slice(0, limit)
    .map((e) => ({
      txHash: e.txHash,
      agentId: e.agentId,
      sender: e.sender,
      tag1: e.tag1,
      tag2: e.tag2,
      category: e.tag2 || e.tag1,
      message: parseKudosMessage(e.feedbackURI),
      feedbackURI: e.feedbackURI,
      blockNumber: e.blockNumber,
      chainId: e.chainId,
    }));

  return { items, total: items.length };
}

export interface KudosDetail {
  txHash: string;
  agentId: number;
  agentName: string;
  sender: string;
  senderName: string;
  value: number;
  category: string;
  message: string;
  from: string;
  source: string;
  tag1: string;
  tag2: string;
  timestamp: string;
  blockNumber: string;
}

const agentNames: Record<number, string> = {};

async function getAgentName(agentId: number): Promise<string> {
  if (agentNames[agentId]) return agentNames[agentId];

  try {
    const apiKey = process.env.EIGHTOOSCAN_API_KEY;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (apiKey) headers['x-api-key'] = apiKey;

    const res = await fetch(
      `https://api.8004scan.io/api/v1/agents?chainId=2741&search=&limit=100`,
      { headers }
    );
    if (res.ok) {
      const data = (await res.json()) as {
        items?: { token_id: string; name: string }[];
      };
      for (const agent of data.items || []) {
        agentNames[Number(agent.token_id)] = agent.name;
      }
    }
  } catch {
    // best-effort enrichment
  }

  return agentNames[agentId] || `Agent #${agentId}`;
}

export async function queryKudosDetail(
  txHash: string,
  chainId: number = DEFAULT_8004_CHAIN_ID
): Promise<
  | { ok: true; kudos: KudosDetail }
  | { ok: false; status: number; error: string }
> {
  if (!isValidTxHash(txHash)) {
    return { ok: false, status: 400, error: 'Invalid tx hash' };
  }

  const client = getPublicClient(chainId);

  try {
    const receipt = await client.getTransactionReceipt({
      hash: txHash as Hex,
    });

    if (receipt.status !== 'success') {
      return { ok: false, status: 404, error: 'Transaction failed' };
    }

    const block = await client.getBlock({
      blockNumber: receipt.blockNumber,
    });

    const feedbackLog = receipt.logs.find(
      (log) =>
        log.address.toLowerCase() ===
          REPUTATION_REGISTRY_ADDRESS.toLowerCase() &&
        log.topics[0] === NEW_FEEDBACK_TOPIC
    );

    if (!feedbackLog) {
      return {
        ok: false,
        status: 404,
        error: 'No feedback event in this transaction',
      };
    }

    const agentId = Number(BigInt(feedbackLog.topics[1] as Hex));
    const sender = ('0x' +
      (feedbackLog.topics[2] as string).slice(26)) as string;

    const decoded = decodeAbiParameters(
      [
        { name: 'feedbackIndex', type: 'uint64' },
        { name: 'value', type: 'int128' },
        { name: 'valueDecimals', type: 'uint8' },
        { name: 'tag1', type: 'string' },
        { name: 'tag2', type: 'string' },
        { name: 'endpoint', type: 'string' },
        { name: 'feedbackURI', type: 'string' },
      ],
      feedbackLog.data as Hex
    );

    const value = Number(decoded[1]);
    const tag1 = decoded[3] as string;
    const tag2 = decoded[4] as string;
    const feedbackURI = decoded[6] as string;

    let from = '';
    let category = tag1 || '';
    let message = '';
    let source = '';

    if (feedbackURI.startsWith('data:,')) {
      try {
        const json = JSON.parse(feedbackURI.slice(6)) as {
          from?: string;
          category?: string;
          message?: string;
          source?: string;
        };
        from = json.from || '';
        category = json.category || category;
        message = json.message || '';
        source = json.source || '';
      } catch {
        // keep defaults
      }
    } else {
      message = parseKudosMessage(feedbackURI) || '';
    }

    const agentName = await getAgentName(agentId);

    return {
      ok: true,
      kudos: {
        txHash,
        agentId,
        agentName,
        sender,
        senderName: from.replace('twitter:@', '@'),
        value,
        category,
        message,
        from: from.replace('twitter:', ''),
        source,
        tag1,
        tag2,
        timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
        blockNumber: receipt.blockNumber.toString(),
      },
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { ok: false, status: 500, error: msg };
  }
}

export interface TipFeedItem {
  type: 'tip';
  tipId: unknown;
  agentId: unknown;
  chainId: unknown;
  amountUsd: unknown;
  fromAddress: string;
  fromAgent: {
    name: string;
    imageUrl: string | null;
    chainId: number;
    tokenId: string;
  } | null;
  paymentTxHash: unknown;
  completedAt: unknown;
}

export interface TipFeedFilters {
  agentId?: number;
  tipId?: string;
  chainId?: number;
  limit?: number;
}

async function resolveFromAgent(
  fromAddress: string,
  chainId: number
): Promise<TipFeedItem['fromAgent']> {
  try {
    const res = await fetch(
      `https://www.8004scan.io/api/v1/agents?search=${fromAddress}&limit=5`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      items?: {
        name: string;
        image_url?: string;
        chain_id: number;
        token_id: string;
        owner_address?: string;
        agent_wallet?: string;
      }[];
    };
    const match = (data.items || []).find(
      (a) =>
        Number(a.chain_id) === chainId &&
        (a.owner_address?.toLowerCase() === fromAddress.toLowerCase() ||
          a.agent_wallet?.toLowerCase() === fromAddress.toLowerCase())
    );
    if (!match) return null;
    return {
      name: match.name,
      imageUrl: match.image_url || null,
      chainId: match.chain_id,
      tokenId: match.token_id,
    };
  } catch {
    return null;
  }
}

export async function queryTipDetail(
  tipId: string
): Promise<
  | { ok: true; tip: TipRecordJSON & { agentName: string } }
  | { ok: false; status: number; error: string }
> {
  if (!tipId) {
    return { ok: false, status: 400, error: 'tipId is required' };
  }
  if (!hasDb()) {
    return { ok: false, status: 404, error: 'Tip not found' };
  }

  const tip = await getTip(tipId);
  if (!tip) {
    return { ok: false, status: 404, error: 'Tip not found' };
  }

  return {
    ok: true,
    tip: {
      ...tipToJSON(tip),
      agentName: `Agent #${tip.agentId}`,
    },
  };
}

export async function queryTipFeed(
  filters: TipFeedFilters
): Promise<
  | { ok: true; items: TipFeedItem[] }
  | { ok: false; status: number; error: string }
> {
  if (filters.tipId) {
    const detail = await queryTipDetail(filters.tipId);
    if (!detail.ok) return detail;
    return {
      ok: true,
      items: [
        {
          type: 'tip',
          tipId: detail.tip.id,
          agentId: detail.tip.agentId,
          chainId: detail.tip.chainId,
          amountUsd: detail.tip.amountUsd,
          fromAddress: detail.tip.fromAddress,
          fromAgent: null,
          paymentTxHash: detail.tip.paymentTxHash || null,
          completedAt: detail.tip.completedAt ?? null,
        },
      ],
    };
  }

  if (filters.agentId === undefined) {
    return { ok: false, status: 400, error: 'agentId or tipId required' };
  }

  if (!hasDb()) {
    return { ok: true, items: [] };
  }

  const chainId = resolveChainId(filters.chainId) ?? DEFAULT_8004_CHAIN_ID;
  const limit = Math.min(Math.max(filters.limit ?? 20, 1), 50);

  await ensureMigrations();
  const sql = getDb();

  try {
    const rows = await sql`
      SELECT id, chain_id, agent_id, amount_usd, from_address, to_address,
             payment_tx_hash, completed_at, kudos_tx_hash
      FROM tips
      WHERE agent_id = ${Number(filters.agentId)}
        AND chain_id = ${chainId}
        AND status = 'completed'
        AND (kudos_tx_hash IS NULL OR kudos_tx_hash = '')
      ORDER BY completed_at DESC
      LIMIT ${limit}
    `;

    const items = await Promise.all(
      rows.map(async (row: Record<string, unknown>) => {
        const fromAddress = String(row.from_address);
        const fromAgent = await resolveFromAgent(fromAddress, chainId);
        return {
          type: 'tip' as const,
          tipId: row.id,
          agentId: row.agent_id,
          chainId: row.chain_id,
          amountUsd: row.amount_usd,
          fromAddress,
          fromAgent,
          paymentTxHash: row.payment_tx_hash || null,
          completedAt: row.completed_at,
        };
      })
    );

    return { ok: true, items };
  } catch {
    return { ok: true, items: [] };
  }
}

export interface TipStats {
  received: Record<string, unknown>[];
  given: Record<string, unknown>[];
  totalReceived: number;
  totalGiven: number;
  countReceived: number;
  countGiven: number;
}

export async function queryTipStats(filters: {
  agentId?: number;
  wallet?: string;
}): Promise<
  { ok: true; stats: TipStats } | { ok: false; status: number; error: string }
> {
  if (filters.agentId === undefined && !filters.wallet) {
    return { ok: false, status: 400, error: 'agentId or wallet required' };
  }

  const empty: TipStats = {
    received: [],
    given: [],
    totalReceived: 0,
    totalGiven: 0,
    countReceived: 0,
    countGiven: 0,
  };

  if (!hasDb()) {
    return { ok: true, stats: empty };
  }

  await ensureMigrations();
  const sql = getDb();

  try {
    const received = filters.agentId
      ? await sql`
          SELECT id, amount_usd, from_address, completed_at, payment_tx_hash
          FROM tips
          WHERE agent_id = ${Number(filters.agentId)} AND status = 'completed'
          ORDER BY completed_at DESC
          LIMIT 50
        `
      : [];

    const given = filters.wallet
      ? await sql`
          SELECT id, agent_id, amount_usd, completed_at, payment_tx_hash, kudos_tx_hash
          FROM tips
          WHERE LOWER(from_address) = ${filters.wallet.toLowerCase()} AND status = 'completed'
          ORDER BY completed_at DESC
          LIMIT 50
        `
      : [];

    const totalReceived = received.reduce(
      (sum: number, t: Record<string, unknown>) =>
        sum + (Number(t.amount_usd) || 0),
      0
    );
    const totalGiven = given.reduce(
      (sum: number, t: Record<string, unknown>) =>
        sum + (Number(t.amount_usd) || 0),
      0
    );

    return {
      ok: true,
      stats: {
        received,
        given,
        totalReceived,
        totalGiven,
        countReceived: received.length,
        countGiven: given.length,
      },
    };
  } catch {
    return { ok: true, stats: empty };
  }
}

export async function queryStreaks(
  address: string
): Promise<
  | { ok: true; address: string; streak: StreakData }
  | { ok: false; status: number; error: string }
> {
  if (!isValidAddress(address)) {
    return { ok: false, status: 400, error: 'Invalid address format' };
  }

  try {
    const streak = await getStreakForAddress(address);
    return { ok: true, address: address.toLowerCase(), streak };
  } catch (error) {
    return {
      ok: false,
      status: 502,
      error: `Failed to fetch streak: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export function queryVouch(address: string):
  | {
      ok: true;
      address: string;
      vouches: PendingVouch[];
      count: number;
    }
  | { ok: false; status: number; error: string } {
  if (!isValidAddress(address)) {
    return { ok: false, status: 400, error: 'Valid Ethereum address required' };
  }

  const { vouches, count } = getVouches(address);
  return { ok: true, address: address.toLowerCase(), vouches, count };
}
