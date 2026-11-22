import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { setImmediate } from 'node:timers/promises';
import { compileFunction } from 'node:vm';
import ts from 'typescript';
import * as viem from 'viem';
import { abstract } from 'viem/chains';

const root = new URL('../../', import.meta.url);
const path = 'lib/feedback-cache.ts';
const revision = process.env.FEEDBACK_MODEL_REV;
const source = revision
  ? execFileSync('git', ['show', revision + ':' + path], {
      cwd: root,
      encoding: 'utf8',
    })
  : readFileSync(new URL(path, root), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
});
const load = compileFunction(compiled.outputText, [
  'require',
  'exports',
  'Date',
]);
const deploy = 39_500_000;
const ttl = 120_001;
const data = viem.encodeAbiParameters(
  viem.parseAbiParameters(
    'uint64,int128,uint8,string,string,string,string,bytes32'
  ),
  [1n, 1n, 0, 'tag', '', '', '', viem.zeroHash]
);

function blocks(mask) {
  return [deploy, deploy + 1, deploy + 2].filter(
    (_, index) => mask & (1 << index)
  );
}

function rawLog(block) {
  return {
    data,
    topics: [viem.zeroHash, '0x01', viem.zeroHash],
    transactionHash: viem.toHex(block, { size: 32 }),
    blockNumber: viem.toHex(block),
    logIndex: '0x0',
  };
}

function model(canonical) {
  let head = deploy;
  let now = 1;
  let reader = '';
  let newestCompleted = deploy - 1;
  const pending = new Map();
  const calls = new Map();
  const trace = [];
  const expected = (through) => canonical.filter((block) => block <= through);
  const cfg = { chain: abstract, deployBlock: deploy, maxLogRange: 500_000 };

  function request({ method, params }) {
    if (method === 'eth_blockNumber') return Promise.resolve(viem.toHex(head));
    assert.equal(method, 'eth_getLogs');
    const from = Number(params[0].fromBlock),
      to = Number(params[0].toBlock);
    assert.ok(from <= to && to <= head);
    return new Promise((resolve, reject) => {
      pending.set(reader, (fail) => {
        if (fail) {
          reject(new Error('interrupted RPC'));
          return;
        }
        newestCompleted = Math.max(newestCompleted, to);
        resolve(
          expected(to)
            .filter((block) => block >= from)
            .map(rawLog)
        );
      });
    });
  }

  const imports = {
    viem: { ...viem, createPublicClient: () => ({ request }) },
    'viem/chains': { abstract },
    '@/config/chain': {
      DEFAULT_FEEDBACK_CHAIN_IDS: [2741],
      SUPPORTED_8004_CHAINS: { 2741: cfg },
    },
    '@/lib/base-feedback-store': {},
  };
  const api = {};
  load(
    (name) => {
      assert.ok(Object.hasOwn(imports, name), 'unmodeled import: ' + name);
      return imports[name];
    },
    api,
    class extends Date {
      static now() {
        return now;
      }
    }
  );
  const read = api.getAllFeedbackEventsForChain ?? api.getAllFeedbackEvents;

  async function start(label, at, expire = true) {
    if (expire) now += ttl;
    head = at;
    reader = label;
    trace.push('start ' + label + ' at head ' + (at - deploy));
    calls.set(
      label,
      read(2741).then(
        (events) => events.map((e) => Number(e.blockNumber)),
        (error) => {
          assert.equal(error.message, 'interrupted RPC');
          return undefined;
        }
      )
    );
    await setImmediate();
  }

  async function finish(label, fail = false) {
    trace.push((fail ? 'interrupt ' : 'finish ') + label);
    const respond = pending.get(label);
    if (respond) {
      pending.delete(label);
      respond(fail);
    }
    await setImmediate();
  }

  function check(actual, wanted, invariant) {
    assert.deepEqual(
      actual,
      wanted,
      invariant +
        ' with logs ' +
        JSON.stringify(canonical.map((b) => b - deploy)) +
        '; ' +
        trace.join(' → ') +
        '; got ' +
        JSON.stringify(actual) +
        ', expected ' +
        JSON.stringify(wanted)
    );
  }

  async function inspect(label) {
    const observations = await calls.get(label);
    if (observations === undefined) return;
    const last = observations.at(-1) ?? deploy - 1;
    check(
      observations,
      expected(last),
      'a reader must see a unique complete prefix'
    );
  }

  async function probe(at, expire) {
    await start('probe', at, expire);
    await finish('probe');
    const visible = await calls.get('probe');
    const through = expire ? at : newestCompleted;
    check(
      visible,
      expected(through),
      expire
        ? 'a refresh must include the next block'
        : 'the published prefix must not regress'
    );
  }
  return { start, finish, inspect, probe };
}

test('two readers publish a unique monotone prefix across delayed and interrupted reads', async () => {
  for (const mode of [
    'newer finishes first',
    'older finishes first',
    'sequential',
  ]) {
    for (const secondHead of [deploy + 1, deploy]) {
      for (let events = 0; events < 8; events++) {
        for (let failures = 0; failures < 4; failures++) {
          const run = model(blocks(events));
          await run.start('A', deploy);
          if (mode === 'sequential') await run.finish('A', failures & 1);
          await run.start('B', secondHead, mode === 'sequential');
          if (mode === 'newer finishes first')
            await run.finish('B', failures & 2);
          if (mode !== 'sequential') await run.finish('A', failures & 1);
          if (mode !== 'newer finishes first')
            await run.finish('B', failures & 2);
          await run.inspect('A');
          await run.inspect('B');
          await run.probe(secondHead, false);
          await run.probe(deploy + 2, true);
        }
      }
    }
  }
});

test('refreshes at a stationary head cannot skip the next block', async () => {
  for (let events = 0; events < 8; events++) {
    for (let head = deploy; head <= deploy + 1; head++) {
      const run = model(blocks(events));
      await run.probe(head, true);
      await run.probe(head, true);
      await run.probe(head + 1, true);
    }
  }
});
