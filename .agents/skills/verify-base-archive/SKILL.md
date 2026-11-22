---
name: verify-base-archive
description: Check Base feedback archive changes that affect stored history, counts, replayed or skipped blocks, cursor coverage, or idle time.
---

# Verify the Base feedback archive

Readers should see the events in the committed range exactly once. A caught-up archive should continue to say complete after the indexer sits idle. Before PR #61, three hours without another write made readers see partial coverage.

With Node 22 and the dependencies from `npm ci`, run this from the repository root.

```sh
npm test -- lib/__tests__/base-archive-model.test.ts
```

Both lag cases should pass. The model calls `commitChunkToStore`, `readScannedThrough`, `readBaseCounts`, and `readBaseHistory` against a disposable file archive. A reference cursor starts just before the deploy block. Only a contiguous write advances it. Each read must agree with the count and ordered history through that cursor.

## Replay the historical failure

Run this from the repository root after installing dependencies. The subshell checks out the pre-fix revision in a temporary worktree and runs the same model there.

```sh
(
  set -eu
  project=$(pwd -P)
  scratch=$(mktemp -d)
  git worktree add --quiet --detach "$scratch" 38cc77f8646ef3d415dfd73f33ea4dc0e9a69de1
  trap 'git -C "$project" worktree remove --force "$scratch"' EXIT
  cp lib/__tests__/base-archive-model.test.ts "$scratch/lib/__tests__/"
  ln -s "$project/node_modules" "$scratch/node_modules"
  cd "$scratch"
  npm test -- lib/__tests__/base-archive-model.test.ts
)
```

Expect exit 1. Commit the first block, retry it, then advance the clock three hours. The cursor still equals the observed head, but the old counts report partial. The case with a 10,000-block lag still passes. Commit `50bb92de` removed the wall-clock condition.

## Bounds and maintenance

The model enumerates 216 schedules. Each takes three actions drawn from submitting the first block, submitting the second block, and waiting three hours. The two blocks each have zero or one canonical event. The observed head is either at the submitted block or 10,000 blocks ahead. The model checks all 648 resulting reads from one process and one writer. PostgreSQL cursor contention, simultaneous writers, process crashes and chain reorganizations require separate checks.

Last checked at `f812eeba8f21dc55e4395199b5ff44e8f4e984fc`. When changing `lib/base-feedback-store.ts` or `deriveCoverage` and `commitChunk` in `lib/base-feedback.ts`, replay the reported steps through the public store functions. If the change introduces a new transition or changes the intended coverage rule, revise the model's bounds and run both commands before advancing the sync revision.
