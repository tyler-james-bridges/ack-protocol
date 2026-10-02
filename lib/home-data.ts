/**
 * Server-side data aggregation for the home page.
 *
 * Fetches all home page data in parallel, returning a single object
 * so the page can be server-rendered with zero client API calls.
 */

import { createPublicClient, http } from 'viem';
import { DEFAULT_8004_CHAIN_ID, getChainConfig } from '@/config/chain';
import {
  getAllFeedbackEventsForChain,
  type FeedbackEvent,
} from './feedback-cache';
import { latestDistinctAgents } from './activity';
import { readBaseCounts, readBaseRecent } from './base-feedback-store';
import { getAllStreaks, getTopStreakers, type StreakData } from './streaks';
import type { ScanAgent } from './api';

const SCAN_API = 'https://8004scan.io/api/v1/public';

export interface RecentKudosItem {
  sender: string;
  agentId: number;
  chainId: number;
  tag1: string;
  tag2: string;
  message: string | null;
  feedbackURI: string;
  txHash: string;
  blockNumber: string;
}

export interface HomePageData {
  leaderboard: (ScanAgent & { kudos: number })[];
  feedbackCounts: Record<number, number>;
  recentKudos: RecentKudosItem[];
  stats: {
    total_agents: number;
    total_kudos: number;
    total_feedbacks: number;
    total_chains: number;
    top_score: number;
    unique_givers: number;
  };
  timestamps: Record<string, number>;
  streaks: Record<string, StreakData>;
  topStreakers: { address: string; streak: StreakData }[];
  activeStreakCount: number;
  feedError: boolean;
}

function parseMessage(feedbackURI: string): string | null {
  try {
    if (feedbackURI.startsWith('data:application/json;base64,')) {
      const json = Buffer.from(
        feedbackURI.replace('data:application/json;base64,', ''),
        'base64'
      ).toString('utf-8');
      const payload = JSON.parse(json);
      return payload.reasoning || payload.message || null;
    }
    if (feedbackURI.startsWith('data:,')) {
      const decoded = decodeURIComponent(feedbackURI.slice(6));
      if (decoded.startsWith('{')) {
        const payload = JSON.parse(decoded);
        return payload.reasoning || payload.message || null;
      }
      return decoded || null;
    }
    if (feedbackURI.startsWith('{')) {
      const payload = JSON.parse(feedbackURI);
      return payload.reasoning || payload.message || null;
    }
  } catch {
    // ignore malformed URIs
  }
  return null;
}

async function loadChainFeedback(chainId: number): Promise<{
  events: FeedbackEvent[];
  counts: Record<number, number>;
  totalKudos: number;
  error: boolean;
}> {
  if (chainId === 8453) {
    try {
      const [countsResult, recent] = await Promise.all([
        readBaseCounts(),
        readBaseRecent(50),
      ]);
      if (countsResult.coverage.status === 'absent') {
        return { events: [], counts: {}, totalKudos: 0, error: false };
      }
      const counts: Record<number, number> = {};
      let totalKudos = 0;
      for (const [agentId, count] of countsResult.counts) {
        counts[agentId] = count;
        totalKudos += count;
      }
      return { events: recent, counts, totalKudos, error: false };
    } catch {
      return { events: [], counts: {}, totalKudos: 0, error: true };
    }
  }

  try {
    const events = await getAllFeedbackEventsForChain(chainId);
    const counts: Record<number, number> = {};
    for (const event of events) {
      counts[event.agentId] = (counts[event.agentId] || 0) + 1;
    }
    return { events, counts, totalKudos: events.length, error: false };
  } catch {
    return { events: [], counts: {}, totalKudos: 0, error: true };
  }
}

async function fetchScanAgents(
  params: Record<string, string | number>
): Promise<{
  items: ScanAgent[];
  total: number;
}> {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    searchParams.set(key, String(value));
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${SCAN_API}/agents?${searchParams}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) return { items: [], total: 0 };
    const json = await res.json();
    return {
      items: (json.data as ScanAgent[]) || [],
      total: json.meta?.pagination?.total ?? 0,
    };
  } catch {
    return { items: [], total: 0 };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getHomePageData(
  chainId: number = DEFAULT_8004_CHAIN_ID
): Promise<HomePageData> {
  const chainClient = createPublicClient({
    chain: getChainConfig(chainId).chain,
    transport: http(getChainConfig(chainId).rpcUrl),
  });
  const [chainAgentsRes, feedback, allStreaks] = await Promise.all([
    fetchScanAgents({
      chainId,
      sortBy: 'total_score',
      sortOrder: 'desc',
      limit: 20,
    }),
    loadChainFeedback(chainId),
    getAllStreaks(chainId),
  ]);
  const feedbackEvents = feedback.events;
  const feedError = feedback.error;
  const feedbackCounts = feedback.counts;

  // Enrich with local kudos counts for display; dedupe by chain:token_id.
  // Do NOT re-sort — 8004scan's total_score ordering is the source of truth.
  const seenAgents = new Set<string>();
  const leaderboard = (chainAgentsRes.items || [])
    .filter((a) => !a.is_testnet)
    .filter((a) => {
      const key = `${a.chain_id}:${a.token_id}`;
      if (seenAgents.has(key)) return false;
      seenAgents.add(key);
      return true;
    })
    .map((agent) => ({
      ...agent,
      kudos: feedbackCounts[Number(agent.token_id)] || 0,
    }))
    .slice(0, 10);

  const sortedEvents = [...feedbackEvents].sort(
    (a, b) => parseInt(b.blockNumber) - parseInt(a.blockNumber)
  );
  const recentKudos: RecentKudosItem[] = latestDistinctAgents(
    sortedEvents,
    5
  ).map((e) => ({
    sender: e.sender,
    agentId: e.agentId,
    chainId: e.chainId,
    tag1: e.tag1,
    tag2: e.tag2,
    message: parseMessage(e.feedbackURI),
    feedbackURI: e.feedbackURI,
    txHash: e.txHash,
    blockNumber: e.blockNumber,
  }));

  // Stats (global from 8004scan + Abstract-specific)
  let globalAgents = 0;
  let globalFeedbacks = 0;
  let globalChains = 0;
  try {
    const globalRes = await fetch(`${SCAN_API}/stats`, {
      next: { revalidate: 300 },
    });
    if (globalRes.ok) {
      const globalData = await globalRes.json();
      globalAgents = globalData.data?.total_agents || 0;
      globalFeedbacks = globalData.data?.total_feedbacks || 0;
      globalChains =
        globalData.data?.supported_chains?.filter(
          (c: { is_testnet: boolean; enabled: boolean }) =>
            !c.is_testnet && c.enabled
        ).length || 0;
    }
  } catch {
    // fallback to 0, template handles it
  }
  const topScore = leaderboard.length > 0 ? leaderboard[0].total_score : 0;
  const uniqueGivers = new Set(
    feedbackEvents.map((e) => e.sender.toLowerCase())
  ).size;
  const stats = {
    total_agents: globalAgents || chainAgentsRes.total || 0,
    total_kudos: feedback.totalKudos,
    total_feedbacks: globalFeedbacks,
    total_chains: globalChains,
    top_score: topScore,
    unique_givers: uniqueGivers,
  };

  // Wave 2: Resolve block timestamps for the 5 recent kudos
  const blockNumbers = [...new Set(recentKudos.map((k) => k.blockNumber))];
  const timestamps: Record<string, number> = {};
  if (blockNumbers.length > 0) {
    await Promise.all(
      blockNumbers.map(async (bn) => {
        try {
          const block = await chainClient.getBlock({
            blockNumber: BigInt(bn),
          });
          timestamps[bn] = Number(block.timestamp);
        } catch {
          // skip failed lookups
        }
      })
    );
  }

  // Top streakers for homepage section
  const topStreakers = await getTopStreakers(5, chainId);
  let activeStreakCount = 0;
  for (const [, s] of allStreaks) {
    if (s.currentStreak > 0) activeStreakCount++;
  }

  // Collect relevant streaks for leaderboard agents and recent kudos senders
  const relevantAddresses = new Set<string>();
  for (const agent of leaderboard) {
    if (agent.owner_address)
      relevantAddresses.add(agent.owner_address.toLowerCase());
    if (agent.agent_wallet)
      relevantAddresses.add(agent.agent_wallet.toLowerCase());
  }
  for (const k of recentKudos) {
    relevantAddresses.add(k.sender.toLowerCase());
  }

  const streaks: Record<string, StreakData> = {};
  for (const addr of relevantAddresses) {
    const s = allStreaks.get(addr);
    if (s) streaks[addr] = s;
  }

  return {
    leaderboard,
    feedbackCounts,
    recentKudos,
    stats,
    timestamps,
    streaks,
    topStreakers,
    activeStreakCount,
    feedError,
  };
}
