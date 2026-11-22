import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { SUPPORTED_8004_CHAINS } from '@/config/chain';
import type { StoredFeedback } from '../base-feedback';
import {
  commitChunkToStore,
  readBaseCounts,
  readBaseHistory,
  readScannedThrough,
} from '../base-feedback-store';

const deploy = SUPPORTED_8004_CHAINS[8453].deployBlock;
const actions = ['first block', 'second block', 'wait three hours'] as const;
type Action = (typeof actions)[number];

function* schedules(prefix: Action[] = []): Generator<Action[]> {
  if (prefix.length === 3) {
    yield prefix;
    return;
  }
  for (const action of actions) yield* schedules([...prefix, action]);
}

function feedback(block: number): StoredFeedback {
  return {
    chainId: 8453,
    agentId: 7,
    sender: '0xabc',
    feedbackIndex: '1',
    value: '5',
    tag1: 'kudos',
    tag2: '',
    feedbackURI: '',
    feedbackHash: '0x00',
    blockNumber: String(block),
    txHash: '0x' + block.toString(16),
    logIndex: 0,
  };
}

async function replay(
  schedule: Action[],
  log: number[],
  lag: number,
  setTime: (now: number) => void
) {
  const committedStatus = lag === 0 ? 'complete' : 'partial';
  let now = 1_700_000_000_000;
  let through = deploy - 1;
  for (const [index, action] of schedule.entries()) {
    const trace = `logs ${JSON.stringify(log)}, after ${schedule.slice(0, index + 1).join(' → ')}`;
    if (action === 'wait three hours') {
      now += 3 * 60 * 60 * 1000;
    }
    setTime(now);
    if (action !== 'wait three hours') {
      const block = action === 'first block' ? deploy : deploy + 1;
      const commit = commitChunkToStore({
        fromBlock: block,
        toBlock: block,
        observedHeadBlock: block + lag,
        events: log.includes(block) ? [feedback(block)] : [],
      });
      if (block > through + 1) {
        await expect(commit, trace).rejects.toThrow();
      } else {
        await commit;
        through = Math.max(block, through);
      }
    }

    const counts = await readBaseCounts();
    const history = await readBaseHistory({ agentId: 7, limit: 10 });
    const visible = log.filter((block) => block <= through);
    const status = through < deploy ? 'absent' : committedStatus;
    expect(await readScannedThrough(), trace).toBe(through);
    expect(counts.coverage.status, trace).toBe(status);
    expect(history.coverage.status, trace).toBe(status);
    expect(counts.counts.get(7) ?? 0, trace).toBe(visible.length);
    expect(
      history.events.map((row) => Number(row.blockNumber)),
      trace
    ).toEqual(visible.reverse());
  }
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it.each([0, 10_000])(
  'publishes the committed prefix across retries, gaps and idle time with %i blocks of lag',
  async (lag) => {
    const directory = await mkdtemp(join(tmpdir(), 'ack-base-archive-'));
    vi.stubEnv('DATABASE_URL', '');
    const clock = vi.spyOn(Date, 'now');
    let scenario = 0;
    try {
      for (let mask = 0; mask < 4; mask++) {
        const log = [deploy, deploy + 1].filter((_, i) => mask & (1 << i));
        for (const schedule of schedules()) {
          vi.stubEnv('BASE_FEEDBACK_DIR', join(directory, String(scenario++)));
          await replay(schedule, log, lag, (now) => clock.mockReturnValue(now));
        }
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
  30_000
);
