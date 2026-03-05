/**
 * Server-side data aggregation for the home page.
 *
 * Fetches all home page data in parallel, returning a single object
 * so the page can be server-rendered with zero client API calls.
 */

import { createPublicClient, http } from 'viem';
import { abstract } from 'viem/chains';
import { getAllFeedbackEvents, type FeedbackEvent } from './feedback-cache';
import { getAllStreaks, getTopStreakers, type StreakData } from './streaks';
import type { ScanAgent } from './api';

const SCAN_API = 'https://www.8004scan.io/api/v1';

const abstractClient = createPublicClient({
  chain: abstract,
  transport: http(),
});

export interface RecentKudosItem {
  sender: string;
  agentId: number;
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
    top_score: number;
    unique_givers: number;
  };
  timestamps: Record<string, number>;
  streaks: Record<string, StreakData>;
  topStreakers: { address: string; streak: StreakData }[];
  activeStreakCount: number;
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
    return res.json();
  } catch {
    return { items: [], total: 0 };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getHomePageData(): Promise<HomePageData> {
  // Wave 1: Fetch everything in parallel (Abstract-only)
  const [abstractAgentsRes, feedbackEvents, allStreaks] = await Promise.all([
    fetchScanAgents({ chain_id: 2741, limit: 50 }),
    getAllFeedbackEvents(),
    getAllStreaks(),
  ]);

  // Build feedback counts map
  const feedbackCounts: Record<number, number> = {};
  for (const e of feedbackEvents) {
    feedbackCounts[e.agentId] = (feedbackCounts[e.agentId] || 0) + 1;
  }

  // Enrich leaderboard with kudos counts and sort
  const enriched = (abstractAgentsRes.items || [])
    .filter((a) => !a.is_testnet)
    .map((agent) => ({
      ...agent,
      kudos: feedbackCounts[Number(agent.token_id)] || 0,
    }));
  enriched.sort(
    (a, b) =>
      b.total_score + b.kudos * 5 - (a.total_score + a.kudos * 5) ||
      b.total_feedbacks - a.total_feedbacks
  );
  const leaderboard = enriched.slice(0, 10);

  // Build recent kudos (top 5, newest first), deduplicating near-identical entries.
  // Two events are considered duplicates if they share the same sender, agentId,
  // tag1, tag2, and message — keeps the earliest (lowest txHash) occurrence.
  const sortedEvents = [...feedbackEvents].sort(
    (a, b) => parseInt(b.blockNumber) - parseInt(a.blockNumber)
  );
  const seenKudos = new Set<string>();
  const recentKudos: RecentKudosItem[] = [];
  for (const e of sortedEvents) {
    if (recentKudos.length >= 5) break;
    const msg = parseMessage(e.feedbackURI);
    const dedupKey = `${e.sender}:${e.agentId}:${e.tag1}:${e.tag2}:${msg || ''}`;
    if (seenKudos.has(dedupKey)) continue;
    seenKudos.add(dedupKey);
    recentKudos.push({
      sender: e.sender,
      agentId: e.agentId,
      tag1: e.tag1,
      tag2: e.tag2,
      message: msg,
      feedbackURI: e.feedbackURI,
      txHash: e.txHash,
      blockNumber: e.blockNumber,
    });
  }

  // Stats (Abstract-only)
  const topScore = leaderboard.length > 0 ? leaderboard[0].total_score : 0;
  const uniqueGivers = new Set(
    feedbackEvents.map((e) => e.sender.toLowerCase())
  ).size;
  const stats = {
    total_agents: abstractAgentsRes.total || 0,
    total_kudos: feedbackEvents.length,
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
          const block = await abstractClient.getBlock({
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
  const topStreakers = await getTopStreakers(5);
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
  };
}
