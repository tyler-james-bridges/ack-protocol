---
name: verify-feedback-refresh
description: Verify the non-Base feedback cache when changing RPC scans, refresh ownership, cursor updates, TTL, or retries in lib/feedback-cache.ts.
---

# Verify feedback refreshes

Two callers can open the feedback feed at the same time. A delayed RPC response must preserve every published feedback event exactly once. An expired read at an unchanged chain head must leave the next mined block available to the following refresh.

## Run

Use Node 22 and the dependencies installed by `npm ci`. From the repository root run:

```sh
node --test tests/model/feedback-refresh.mjs
```

Both checks should pass. The checker loads the actual TypeScript cache in a fresh module for each schedule and invokes its public read function. It supplies the clock and a deterministic RPC transport. It runs offline.

## Replay the failures

With the repository's Git history available, run each command separately. Each should exit 1 and print a counterexample.

```sh
FEEDBACK_MODEL_REV=888862fa9aca97d2286d96948909a02ce5507659 node --test tests/model/feedback-refresh.mjs
FEEDBACK_MODEL_REV=f812eeba8f21dc55e4395199b5ff44e8f4e984fc node --test tests/model/feedback-refresh.mjs
```

At `888862fa`, both callers read the deployment block. B finishes first, then A returns the same feedback twice. At `f812eeba`, B sees the next block and publishes its event. A finishes its older scan, and a fresh reader sees an empty feed. The stationary-head check also fails on both commits. Two scans see the same head, a new block arrives with feedback, and the following refresh skips it.

## What each check covers

| Check           | Production behavior                                                                                                                                                                                             | Bounds                                                                                                                                                                                                                          |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Two readers     | `getAllFeedbackEventsForChain` enters `fetchChainFeedback`. Overlapping callers can share a refresh. In `scanChain`, publication follows the last successful RPC read. A later read can retry a failed refresh. | 192 schedules. All eight event placements on three blocks, two heads for B, three start/finish orders up to renaming A and B, and four log-request failure choices. Every schedule ends with a cache read and an expired retry. |
| Stationary head | `scanChain` stores the highest completed block. A second read at that head preserves the cursor.                                                                                                                | 16 schedules. All eight placements, with the first head at either of the first two blocks. Two expired reads see the same head, then the next block arrives.                                                                    |

The model covers one process and one non-Base chain with at most one event per block. Each scan has at most one log range. Head reads resolve immediately and log reads may be delayed or interrupted. The transport returns canonical events in block order. Reorganizations, duplicate provider responses, multi-range scans, multiple processes and the Base database indexer are outside these bounds.

## Maintain

The last historical sync commit is `f812eeba8f21dc55e4395199b5ff44e8f4e984fc`. The corrected implementation checked here is Git blob `6b8495b5404aff27f436cc58bc572e05341b7b7a` for `lib/feedback-cache.ts`.

When changing that file, compare the failure trace with the order in which the real code reads the head, requests logs and publishes. A trace possible through the public read function is a bug. If a new I/O boundary changes the possible orders, update the scheduler, rerun the historical replays and confirm the corrected implementation passes. Advance the sync commit and source blob only after checking the mapping again. Use `/maintain-formal-verification-skill` to bring stale coverage up to date.
