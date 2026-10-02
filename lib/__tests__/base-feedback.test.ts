import { describe, expect, it } from 'vitest';
import { SUPPORTED_8004_CHAINS } from '@/config/chain';
import {
  commitChunk,
  countsByAgent,
  deriveCoverage,
  planNextChunk,
  type StoredFeedback,
} from '../base-feedback';

const maxLogRange = SUPPORTED_8004_CHAINS[8453].maxLogRange;
const now = 1_700_000_000_000;

function event(overrides: Partial<StoredFeedback> = {}): StoredFeedback {
  return {
    sender: '0xabc',
    agentId: 5,
    feedbackIndex: '1',
    value: '100',
    tag1: '',
    tag2: '',
    feedbackURI: '',
    feedbackHash: '0x00',
    blockNumber: '41664000',
    txHash: '0x111',
    chainId: 8453,
    logIndex: 1,
    ...overrides,
  };
}

describe('planNextChunk', () => {
  it('starts at the deploy block and stays inside a 2000 block range', () => {
    expect(planNextChunk(41663999, 50_000_000, maxLogRange)).toEqual({
      fromBlock: 41664000,
      toBlock: 41665999,
    });
  });

  it('returns null when the scan has reached the head', () => {
    expect(planNextChunk(51904950, 51904950, maxLogRange)).toBeNull();
  });
});

describe('commitChunk', () => {
  it('advances an empty chunk and keeps the event list empty', () => {
    const state = {
      scannedThroughBlock: 41663999,
      events: [] as StoredFeedback[],
    };
    const next = commitChunk(state, {
      fromBlock: 41664000,
      toBlock: 41665999,
      events: [],
    });
    expect(next.scannedThroughBlock).toBe(41665999);
    expect(next.events).toEqual([]);
    expect(state.events).toEqual([]);
  });

  it('ignores a replay of an already scanned range', () => {
    const state = {
      scannedThroughBlock: 41665999,
      events: [event()],
    };
    const next = commitChunk(state, {
      fromBlock: 41664000,
      toBlock: 41665999,
      events: [event({ txHash: '0x222', logIndex: 2 })],
    });
    expect(next).toBe(state);
    expect(next.scannedThroughBlock).toBe(41665999);
    expect(next.events).toHaveLength(1);
  });

  it('leaves state unchanged when the chunk skips ahead', () => {
    const state = {
      scannedThroughBlock: 41663999,
      events: [event()],
    };
    const next = commitChunk(state, {
      fromBlock: 41666000,
      toBlock: 41667999,
      events: [event({ txHash: '0x333', logIndex: 3 })],
    });
    expect(next).toBe(state);
    expect(next.scannedThroughBlock).toBe(41663999);
    expect(next.events).toHaveLength(1);
  });

  it('appends a new event and stores one copy of chainId:txHash:logIndex', () => {
    const kept = event({ txHash: '0xaaa', logIndex: 4 });
    const state = { scannedThroughBlock: 10, events: [kept] };
    const next = commitChunk(state, {
      fromBlock: 11,
      toBlock: 20,
      events: [
        event({ txHash: '0xaaa', logIndex: 4 }),
        event({ txHash: '0xbbb', logIndex: 5, agentId: 9 }),
        event({ txHash: '0xbbb', logIndex: 5, agentId: 9 }),
      ],
    });
    expect(next.scannedThroughBlock).toBe(20);
    expect(next.events).toHaveLength(2);
    expect(next.events.map((item) => item.txHash)).toEqual(['0xaaa', '0xbbb']);
    expect(state.events).toHaveLength(1);
    expect(state.events[0]).toBe(kept);
  });
});

describe('deriveCoverage', () => {
  it('is absent when there is no cursor', () => {
    expect(deriveCoverage(null)).toEqual({ status: 'absent' });
  });

  it('is complete when the scan has reached the observed head', () => {
    expect(
      deriveCoverage({
        scannedThroughBlock: 51904950,
        observedHeadBlock: 51904950,
        updatedAt: now,
      })
    ).toEqual({
      status: 'complete',
      deployBlock: 41664000,
      scannedThroughBlock: 51904950,
      observedHeadBlock: 51904950,
      updatedAt: now,
    });
  });

  it('stays complete when the cursor reached head and has not been touched for hours', () => {
    const updatedAt = now - 3 * 60 * 60 * 1000;
    expect(
      deriveCoverage({
        scannedThroughBlock: 51904950,
        observedHeadBlock: 51904950,
        updatedAt,
      })
    ).toEqual({
      status: 'complete',
      deployBlock: 41664000,
      scannedThroughBlock: 51904950,
      observedHeadBlock: 51904950,
      updatedAt,
    });
  });

  it('is partial when the cursor is 10000 blocks behind its head', () => {
    expect(
      deriveCoverage({
        scannedThroughBlock: 1_000_000,
        observedHeadBlock: 1_010_000,
        updatedAt: now,
      })
    ).toEqual({
      status: 'partial',
      deployBlock: 41664000,
      scannedThroughBlock: 1_000_000,
      observedHeadBlock: 1_010_000,
      updatedAt: now,
    });
  });
});

describe('countsByAgent', () => {
  it('does not add an Abstract event to the Base count for the same agent', () => {
    const counts = countsByAgent([
      { chainId: 2741, agentId: 5 },
      { chainId: 8453, agentId: 5 },
    ]);
    expect(counts.get(5)).toBe(1);
    expect([...counts.keys()]).toEqual([5]);
  });
});
