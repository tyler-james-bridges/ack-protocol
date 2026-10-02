export function kudosWindow(
  archiveTotal: number | null,
  shown: number
): { total: number; capped: boolean } {
  if (archiveTotal === null) return { total: shown, capped: false };
  return {
    total: Math.max(archiveTotal, shown),
    capped: archiveTotal > shown,
  };
}

export function latestDistinctAgents<T extends { agentId: number }>(
  events: T[],
  limit: number
): T[] {
  const seen = new Set<number>();
  const picked: T[] = [];
  for (const event of events) {
    if (seen.has(event.agentId)) continue;
    seen.add(event.agentId);
    picked.push(event);
    if (picked.length >= limit) break;
  }
  return picked;
}

export function groupSenders<T extends { sender: string }>(
  events: T[],
  limit: number
): { event: T; count: number }[] {
  const groups: { event: T; count: number }[] = [];
  const index = new Map<string, number>();
  for (const event of events) {
    const key = event.sender.toLowerCase();
    const at = index.get(key);
    if (at === undefined) {
      if (groups.length >= limit) continue;
      index.set(key, groups.length);
      groups.push({ event, count: 1 });
      continue;
    }
    groups[at].count += 1;
  }
  return groups;
}
