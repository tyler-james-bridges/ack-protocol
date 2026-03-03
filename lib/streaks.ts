/**
 * Kudos Streaks — tracks consecutive days users give kudos.
 *
 * Builds on the feedback cache to compute streaks without additional RPC calls.
 * Uses block timestamp estimation (Abstract ~1s block time) instead of
 * fetching actual block timestamps to avoid RPC overhead.
 */

import { getAllFeedbackEvents } from './feedback-cache';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastKudosDate: string | null;
  isActiveToday: boolean;
  totalDaysActive: number;
}

interface StreakCache {
  streaks: Map<string, StreakData>;
  ts: number;
}

let streakCache: StreakCache | null = null;
const STREAK_CACHE_TTL = 60_000; // 60s, matches feedback cache

function toUTCDateString(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA + 'T00:00:00Z').getTime();
  const b = new Date(dateB + 'T00:00:00Z').getTime();
  return Math.round(Math.abs(a - b) / (1000 * 60 * 60 * 24));
}

function computeStreak(dates: string[]): StreakData {
  if (dates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastKudosDate: null,
      isActiveToday: false,
      totalDaysActive: 0,
    };
  }

  // Sort dates descending (most recent first)
  const sorted = [...new Set(dates)].sort().reverse();
  const today = toUTCDateString(Math.floor(Date.now() / 1000));

  const isActiveToday = sorted[0] === today;

  // Compute current streak: walk backwards from today/yesterday
  let currentStreak = 0;
  let checkDate = today;

  // If not active today, check if active yesterday to still count streak
  if (!isActiveToday) {
    const yesterday = toUTCDateString(Math.floor(Date.now() / 1000) - 86400);
    if (sorted[0] !== yesterday) {
      // Streak is broken — last activity was more than 1 day ago
      return {
        currentStreak: 0,
        longestStreak: computeLongestStreak(sorted),
        lastKudosDate: sorted[0],
        isActiveToday: false,
        totalDaysActive: sorted.length,
      };
    }
    checkDate = yesterday;
  }

  const dateSet = new Set(sorted);
  while (dateSet.has(checkDate)) {
    currentStreak++;
    // Go back one day
    const ts = new Date(checkDate + 'T00:00:00Z').getTime() / 1000 - 86400;
    checkDate = toUTCDateString(ts);
  }

  return {
    currentStreak,
    longestStreak: Math.max(currentStreak, computeLongestStreak(sorted)),
    lastKudosDate: sorted[0],
    isActiveToday,
    totalDaysActive: sorted.length,
  };
}

function computeLongestStreak(sortedDatesDesc: string[]): number {
  if (sortedDatesDesc.length === 0) return 0;

  // Process in ascending order
  const asc = [...sortedDatesDesc].reverse();
  let longest = 1;
  let current = 1;

  for (let i = 1; i < asc.length; i++) {
    if (daysBetween(asc[i - 1], asc[i]) === 1) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }

  return longest;
}

/**
 * Compute streaks for all senders.
 * Uses block number estimation for timestamps: Abstract has ~1s block time,
 * so we estimate: estimatedTs = currentTimestamp - (currentBlock - targetBlock)
 */
export async function getAllStreaks(): Promise<Map<string, StreakData>> {
  const now = Date.now();
  if (streakCache && now - streakCache.ts < STREAK_CACHE_TTL) {
    return streakCache.streaks;
  }

  const events = await getAllFeedbackEvents();

  // Estimate timestamps from block numbers
  // Abstract L2 has ~1 second block time
  const currentTimestamp = Math.floor(now / 1000);
  const maxBlock = events.reduce(
    (max, e) => Math.max(max, parseInt(e.blockNumber)),
    0
  );

  // Group events by sender, convert block numbers to dates
  const senderDates = new Map<string, string[]>();

  for (const event of events) {
    const blockNum = parseInt(event.blockNumber);
    const estimatedTs = currentTimestamp - (maxBlock - blockNum);
    const dateStr = toUTCDateString(estimatedTs);

    const sender = event.sender.toLowerCase();
    const dates = senderDates.get(sender) || [];
    dates.push(dateStr);
    senderDates.set(sender, dates);
  }

  // Compute streaks for each sender
  const streaks = new Map<string, StreakData>();
  for (const [sender, dates] of senderDates) {
    streaks.set(sender, computeStreak(dates));
  }

  streakCache = { streaks, ts: now };
  return streaks;
}

/**
 * Get streak data for a single address.
 */
export async function getStreakForAddress(
  address: string
): Promise<StreakData> {
  const all = await getAllStreaks();
  return (
    all.get(address.toLowerCase()) || {
      currentStreak: 0,
      longestStreak: 0,
      lastKudosDate: null,
      isActiveToday: false,
      totalDaysActive: 0,
    }
  );
}

/**
 * Get top streakers sorted by current streak (descending).
 */
export async function getTopStreakers(
  limit: number = 20
): Promise<{ address: string; streak: StreakData }[]> {
  const all = await getAllStreaks();
  return [...all.entries()]
    .map(([address, streak]) => ({ address, streak }))
    .filter((s) => s.streak.currentStreak > 0)
    .sort((a, b) => b.streak.currentStreak - a.streak.currentStreak)
    .slice(0, limit);
}
