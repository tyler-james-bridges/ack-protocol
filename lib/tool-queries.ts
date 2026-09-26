/**
 * Shared query helpers for ERC-8257 tool actions.
 *
 * Existing HTTP routes stay untouched. The tool handler and future tools
 * reuse this module instead of calling those routes internally.
 */

import { KUDOS_CATEGORIES, type KudosCategory } from '@/config/contract';
import type { ScanAgent, ScanAgentsResponse } from '@/lib/api';
import { getFeedbackByAgentId, type FeedbackEvent } from '@/lib/feedback-cache';

const SCAN_API_BASE = 'https://www.8004scan.io/api/v1';

export const ETH_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export interface AgentReputation {
  chainId: number;
  agentId: number;
  name: string;
  totalScore: number;
}

export interface ReputationProfile {
  address: string;
  agents: AgentReputation[];
  aggregatedScore: number;
  trustScore: number;
  totalKudos: number;
  topCategory: KudosCategory | null;
  categories: Record<KudosCategory, number>;
}

export interface DiscoverAgent {
  chainId: number;
  agentId: number;
  name: string;
  description: string | null;
  ownerAddress: string;
  totalScore: number;
  totalFeedbacks: number;
  isVerified: boolean;
  imageUrl: string | null;
  tags: string[];
  kudosCount: number;
  topCategory: KudosCategory | null;
  categories: Record<KudosCategory, number>;
}

export interface DiscoverAgentsResult {
  agents: DiscoverAgent[];
  total: number;
  limit: number;
  offset: number;
}

export interface DiscoverAgentsOptions {
  category?: string;
  chainId?: number;
  limit?: number;
  offset?: number;
  minScore?: number;
  query?: string;
}

export interface FeedbackHistoryItem {
  sender: string;
  agentId: number;
  value: string;
  tag1: string;
  tag2: string;
  category: string | null;
  feedbackURI: string;
  feedbackHash: string;
  blockNumber: string;
  txHash: string;
  chainId: number;
}

export interface FeedbackHistoryResult {
  agentId: number;
  events: FeedbackHistoryItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface AgentInfo {
  chainId: number;
  agentId: number;
  name: string;
  description: string | null;
  ownerAddress: string;
  totalScore: number;
  totalFeedbacks: number;
  isVerified: boolean;
  imageUrl: string | null;
  tags: string[];
  categories: string[];
  supportedProtocols: string[];
  createdAt: string | null;
}

export const MAX_DISCOVER_LIMIT = 50;
export const MAX_FEEDBACK_LIMIT = 100;
export const DEFAULT_DISCOVER_LIMIT = 20;
export const DEFAULT_FEEDBACK_LIMIT = 20;

export function emptyCategoryCounts(): Record<KudosCategory, number> {
  return Object.fromEntries(KUDOS_CATEGORIES.map((c) => [c, 0])) as Record<
    KudosCategory,
    number
  >;
}

export function isKudosCategory(value: string): value is KudosCategory {
  return (KUDOS_CATEGORIES as readonly string[]).includes(value);
}

export async function scanFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${SCAN_API_BASE}/${path}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 30 },
  });
  if (!response.ok) {
    throw new Error(`8004scan error: ${response.status}`);
  }
  return unwrapScanPayload<T>(await response.json());
}

function unwrapScanPayload<T>(json: unknown): T {
  if (!json || typeof json !== 'object' || !('success' in json)) {
    return json as T;
  }

  const envelope = json as {
    data?: unknown;
    meta?: { pagination?: { total?: number; limit?: number; page?: number } };
  };
  const data = envelope.data;

  if (Array.isArray(data)) {
    const pagination = envelope.meta?.pagination;
    const limit = pagination?.limit ?? data.length;
    const page = pagination?.page ?? 1;
    return {
      items: data,
      total: pagination?.total ?? data.length,
      limit,
      offset: Math.max(0, (page - 1) * limit),
    } as T;
  }

  return (data ?? json) as T;
}

/** Fetch non-testnet agents owned by an address (up to 300). */
export async function fetchAgentsByOwner(
  ownerAddress: string
): Promise<ScanAgent[]> {
  const pageSize = 100;
  const results: ScanAgent[] = [];

  const first = await scanFetch<ScanAgentsResponse>(
    `agents?owner_address=${ownerAddress}&limit=${pageSize}&offset=0`
  );
  results.push(...(first.items || []));

  if (first.total > pageSize) {
    const remaining = Math.min(Math.ceil(first.total / pageSize), 3) - 1;
    const pages = await Promise.all(
      Array.from({ length: remaining }, (_, i) =>
        scanFetch<ScanAgentsResponse>(
          `agents?owner_address=${ownerAddress}&limit=${pageSize}&offset=${(i + 1) * pageSize}`
        )
      )
    );
    for (const page of pages) {
      results.push(...(page.items || []));
    }
  }

  const seen = new Set<string>();
  return results.filter((agent) => {
    if (agent.is_testnet || seen.has(agent.id)) return false;
    seen.add(agent.id);
    return true;
  });
}

export function aggregateKudos(
  feedbacks: Array<Pick<FeedbackEvent, 'tag1' | 'tag2'>>
): {
  kudosCount: number;
  categories: Record<KudosCategory, number>;
  topCategory: KudosCategory | null;
} {
  const categories = emptyCategoryCounts();
  const kudosFeedbacks = feedbacks.filter((f) => f.tag1 === 'kudos');

  for (const feedback of kudosFeedbacks) {
    if (isKudosCategory(feedback.tag2)) {
      categories[feedback.tag2]++;
    }
  }

  const kudosCount = kudosFeedbacks.length;
  const topCategory =
    kudosCount > 0
      ? (Object.entries(categories).sort(
          ([, a], [, b]) => b - a
        )[0][0] as KudosCategory)
      : null;

  return { kudosCount, categories, topCategory };
}

export async function getReputationByAddress(
  address: string
): Promise<ReputationProfile> {
  const agentsOwned = await fetchAgentsByOwner(address);

  if (agentsOwned.length === 0) {
    return {
      address,
      agents: [],
      aggregatedScore: 0,
      trustScore: 0,
      totalKudos: 0,
      topCategory: null,
      categories: emptyCategoryCounts(),
    };
  }

  const feedbackResults = await Promise.all(
    agentsOwned.map((agent) =>
      getFeedbackByAgentId(Number(agent.token_id)).then((feedbacks) => ({
        agent,
        feedbacks,
      }))
    )
  );

  const categories = emptyCategoryCounts();
  let totalKudos = 0;
  const agents: AgentReputation[] = [];

  for (const { agent, feedbacks } of feedbackResults) {
    const kudos = aggregateKudos(feedbacks);
    totalKudos += kudos.kudosCount;
    for (const category of KUDOS_CATEGORIES) {
      categories[category] += kudos.categories[category];
    }
    agents.push({
      chainId: agent.chain_id,
      agentId: Number(agent.token_id),
      name: agent.name || `Agent #${agent.token_id}`,
      totalScore: agent.total_score ?? 0,
    });
  }

  const aggregatedScore =
    agents.length > 0
      ? Math.round(
          (agents.reduce((sum, agent) => sum + agent.totalScore, 0) /
            agents.length) *
            10
        ) / 10
      : 0;

  const topCategory =
    totalKudos > 0
      ? (Object.entries(categories).sort(
          ([, a], [, b]) => b - a
        )[0][0] as KudosCategory)
      : null;

  return {
    address,
    agents,
    aggregatedScore,
    trustScore: aggregatedScore,
    totalKudos,
    topCategory,
    categories,
  };
}

export function enrichAgent(
  agent: ScanAgent,
  feedbacks: Array<Pick<FeedbackEvent, 'tag1' | 'tag2'>>
): DiscoverAgent {
  const kudos = aggregateKudos(feedbacks);
  return {
    chainId: agent.chain_id,
    agentId: Number(agent.token_id),
    name: agent.name || `Agent #${agent.token_id}`,
    description: agent.description,
    ownerAddress: agent.owner_address,
    totalScore: agent.total_score ?? 0,
    totalFeedbacks: agent.total_feedbacks ?? 0,
    isVerified: agent.is_verified,
    imageUrl: agent.image_url,
    tags: agent.tags || [],
    kudosCount: kudos.kudosCount,
    topCategory: kudos.topCategory,
    categories: kudos.categories,
  };
}

export async function discoverAgents(
  options: DiscoverAgentsOptions = {}
): Promise<DiscoverAgentsResult> {
  const limit = Math.min(
    Math.max(1, options.limit ?? DEFAULT_DISCOVER_LIMIT),
    MAX_DISCOVER_LIMIT
  );
  const offset = Math.max(0, options.offset ?? 0);
  const minScore = options.minScore ?? 0;
  const category = options.category;
  const fetchLimit = Math.min((limit + offset) * 2, 200);

  const params = new URLSearchParams();
  params.set('limit', String(fetchLimit));
  params.set('offset', '0');
  params.set('sort_by', 'total_score');
  params.set('sort_order', 'desc');
  if (options.chainId) params.set('chain_id', String(options.chainId));
  if (options.query) params.set('search', options.query);

  const data = await scanFetch<ScanAgentsResponse>(
    `agents?${params.toString()}`
  );

  let agents = (data.items || []).filter(
    (agent) => !agent.is_testnet && (agent.total_score ?? 0) >= minScore
  );

  const enriched: DiscoverAgent[] = [];

  if (category) {
    const candidateAgents = agents.slice(0, 50);
    const withFeedback = await Promise.all(
      candidateAgents.map((agent) =>
        getFeedbackByAgentId(Number(agent.token_id)).then((feedbacks) =>
          enrichAgent(agent, feedbacks)
        )
      )
    );
    for (const agent of withFeedback) {
      if (agent.categories[category as KudosCategory] > 0) {
        enriched.push(agent);
      }
    }
  } else {
    agents = agents.slice(offset, offset + limit);
    const withFeedback = await Promise.all(
      agents.map((agent) =>
        getFeedbackByAgentId(Number(agent.token_id)).then((feedbacks) =>
          enrichAgent(agent, feedbacks)
        )
      )
    );
    enriched.push(...withFeedback);
  }

  const paginatedAgents = category
    ? enriched.slice(offset, offset + limit)
    : enriched;

  return {
    agents: paginatedAgents,
    total: category ? enriched.length : data.total,
    limit,
    offset,
  };
}

export async function getFeedbackHistory(options: {
  agentId: number;
  limit?: number;
  offset?: number;
}): Promise<FeedbackHistoryResult> {
  const limit = Math.min(
    Math.max(1, options.limit ?? DEFAULT_FEEDBACK_LIMIT),
    MAX_FEEDBACK_LIMIT
  );
  const offset = Math.max(0, options.offset ?? 0);
  const all = await getFeedbackByAgentId(options.agentId);
  const sorted = [...all].sort(
    (a, b) => parseInt(b.blockNumber, 10) - parseInt(a.blockNumber, 10)
  );
  const page = sorted.slice(offset, offset + limit);

  return {
    agentId: options.agentId,
    events: page.map(toFeedbackHistoryItem),
    total: sorted.length,
    limit,
    offset,
  };
}

function toFeedbackHistoryItem(event: FeedbackEvent): FeedbackHistoryItem {
  return {
    sender: event.sender,
    agentId: event.agentId,
    value: event.value,
    tag1: event.tag1,
    tag2: event.tag2,
    category:
      event.tag1 === 'kudos' && isKudosCategory(event.tag2) ? event.tag2 : null,
    feedbackURI: event.feedbackURI,
    feedbackHash: event.feedbackHash,
    blockNumber: event.blockNumber,
    txHash: event.txHash,
    chainId: event.chainId,
  };
}

export async function getAgentById(
  chainId: number,
  agentId: number
): Promise<ScanAgent | null> {
  try {
    const agent = await scanFetch<ScanAgent>(`agents/${chainId}/${agentId}`);
    if (!agent || typeof agent !== 'object') return null;
    if (!('token_id' in agent) && !('name' in agent)) return null;
    return agent;
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return null;
    }
    throw error;
  }
}

export function toAgentInfo(agent: ScanAgent): AgentInfo {
  return {
    chainId: agent.chain_id,
    agentId: Number(agent.token_id),
    name: agent.name || `Agent #${agent.token_id}`,
    description: agent.description,
    ownerAddress: agent.owner_address,
    totalScore: agent.total_score ?? 0,
    totalFeedbacks: agent.total_feedbacks ?? 0,
    isVerified: agent.is_verified,
    imageUrl: agent.image_url,
    tags: agent.tags || [],
    categories: agent.categories || [],
    supportedProtocols: agent.supported_protocols || [],
    createdAt: agent.created_at || null,
  };
}

export async function getAgentInfo(options: {
  chainId: number;
  agentId: number;
}): Promise<AgentInfo | null> {
  const agent = await getAgentById(options.chainId, options.agentId);
  return agent ? toAgentInfo(agent) : null;
}
