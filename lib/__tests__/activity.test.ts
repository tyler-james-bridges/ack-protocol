import { describe, expect, it } from 'vitest';
import { groupSenders, kudosWindow, latestDistinctAgents } from '../activity';
import { resolveBaseAgents } from '../explore-list';

describe('kudosWindow', () => {
  it('keeps the archive total when the loaded history is shorter', () => {
    expect(kudosWindow(662, 500)).toEqual({ total: 662, capped: true });
  });

  it('does not invent a larger total when the archive is absent', () => {
    expect(kudosWindow(null, 4)).toEqual({ total: 4, capped: false });
  });
});

describe('latestDistinctAgents', () => {
  it('keeps one row per agent, newest first', () => {
    const events = [
      { agentId: 25975, txHash: 'a' },
      { agentId: 25975, txHash: 'b' },
      { agentId: 2290, txHash: 'c' },
      { agentId: 25975, txHash: 'd' },
    ];
    expect(
      latestDistinctAgents(events, 5).map((event) => event.txHash)
    ).toEqual(['a', 'c']);
  });
});

describe('groupSenders', () => {
  it('collapses repeated senders and counts the ones past the visible limit', () => {
    const events = [
      { sender: '0xAAA', id: 1 },
      { sender: '0xbbb', id: 2 },
      { sender: '0xaaa', id: 3 },
    ];
    expect(groupSenders(events, 1)).toEqual([
      { event: { sender: '0xAAA', id: 1 }, count: 2 },
    ]);
  });
});

describe('resolveBaseAgents', () => {
  it('keeps the server list when a kudos fetch comes back empty', () => {
    const initial = [{ name: 'Clawdia' }];
    expect(resolveBaseAgents(initial, [])).toEqual(initial);
    expect(resolveBaseAgents(initial, undefined)).toEqual(initial);
  });

  it('uses a non-empty client list', () => {
    const fetched = [{ name: 'axedraxos' }];
    expect(resolveBaseAgents([{ name: 'Clawdia' }], fetched)).toEqual(fetched);
  });

  it('is empty only when both sources are empty', () => {
    expect(resolveBaseAgents([], [])).toEqual([]);
    expect(resolveBaseAgents([], undefined)).toEqual([]);
  });
});
