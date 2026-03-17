# Handle Resolution Spec

## Problem

Kudos via X/Twitter currently requires knowing an agent's token ID (`#649 ++`). Nobody knows their agent's number off the top of their head. The natural UX is `@Rocky_onabs ++` but handle-to-agent resolution fails for any handle not in our hardcoded map or HandleRegistry.

## Current State

Resolution order in `resolveHandleToAgentId`:

1. Query HandleRegistry contract for a linked agent
2. Fall back to hardcoded map (`ack_onchain: 606`, `bighoss: 592`)
3. If neither, return null (kudos silently fails)

The HandleRegistry exists and the claim flow is built (`ack-claim-XXXXXX`), but nobody has used it. The registry is empty except for handles we registered ourselves.

## Goal

Any agent with an X account can receive kudos by handle without manual setup.

## Approach

Three phases, each independently shippable.

---

### Phase 1: Seed the Registry

**Effort:** No code changes. Onchain writes only.

Scrape 8004scan for Abstract agents that have known X handles (from their metadata, profile links, or known associations). Batch-register and link them in the HandleRegistry.

**Data source:** `GET /api/v1/agents?chain_id=2741&limit=100&is_testnet=false&is_registered=true`

**Extraction:** Regex agent `description` fields for `@handle` patterns and `x.com/handle` links. Filter out common non-handle words (@AbstractChain, @the, etc).

**Current yield:** 2 of 53 agents have discoverable X handles:

- Rocky (#649) -> @Rocky_onabs
- Bandit (#612) -> @mybuppys

**Steps:**

1. For each discovered handle, call `registerHandle("x", handle)` then `linkAgent(hash, agentId)` using ACK's wallet
2. Log all registrations for audit

**Risks:**

- Linking the wrong handle to an agent (description may be wrong)
- Gas costs for batch registration (minimal, ~$0.01-0.05 per registration)
- We're asserting the link without the owner verifying it

**Mitigation:**

- Only link handles where the evidence is strong (exact match in agent description/metadata)
- Owners can override via the claim flow
- Keep a log of all auto-linked handles

**Reality check:** With only 2 discoverable handles, Phase 1 alone won't move the needle. Phase 2 is the real solution since it resolves handles at runtime and grows the registry organically.

---

### Phase 2: Fallback Resolution via Metadata

**Effort:** Small code change to `resolveHandleToAgentId` in `services/twitter-agent/src/onchain.ts`.

When HandleRegistry lookup fails, search 8004scan for an agent whose metadata contains the target X handle. If found, auto-link in the HandleRegistry and process the kudos.

**Resolution order (updated):**

1. HandleRegistry contract lookup
2. 8004scan metadata search (new)
3. If found, auto-register + auto-link in HandleRegistry (new)
4. Hardcoded map fallback
5. If none, trigger onboarding reply (Phase 3)

**Search strategy:**

- `GET https://www.8004scan.io/api/v1/public/agents/search?q={handle}&chainId=2741&semanticWeight=0`
- 8004scan public API with keyword search (semanticWeight=0) and Abstract chain filter
- Returns agents whose name or description matches the query
- Verify the result by checking that `@{handle}` appears in the agent's description (case-insensitive)
- Example: search for "Rocky_onabs" returns agent #649 whose description contains "@Rocky_onabs"
- Cache results (5-min TTL, same pattern as `resolveAgentByWallet`)
- Anonymous tier allows 10 results per query, no auth required

**Auto-link behavior:**

- When a match is found via metadata search, register the handle AND link the agent in one flow
- This builds the HandleRegistry over time as kudos are given
- Future lookups for the same handle hit the registry directly (fast path)

**Edge case: Multiple agents claim the same X handle**

- First match wins (by token ID order from 8004scan)
- Owner can override via claim flow

---

### Phase 3: Onboarding Reply for Unresolved Handles

**Effort:** Small code change to twitter agent's mention handler (`services/twitter-agent/src/index.ts`).

When a handle can't be resolved after all fallbacks, instead of silently failing, reply with a helpful message.

**Reply template:**

```
I don't recognize @{handle} as a registered agent yet.

If you're the owner, reply with your agent ID (e.g. "agent 649") and I'll send you a claim code to link your handle.

You can also give kudos by agent ID: @ack_onchain #{id} ++
```

**Claim flow (already built):**

1. Owner replies with agent ID
2. Bot creates challenge via `createChallenge(handle, ownerWallet, agentId)`
3. Bot replies: "Tweet this code to verify: ack-claim-XXXXXX"
4. Owner tweets the code
5. Bot verifies via `parseClaimCode`, calls `submitClaim`
6. Handle permanently linked in HandleRegistry

---

## Data Model

No new contracts or tables needed. Everything uses the existing HandleRegistry at `0xf32ed012f0978a9b963df11743e797a108c94871`.

HandleRegistry stores:

- `platform` (string): always "x" for Twitter
- `handle` (string): lowercase X handle
- `claimedBy` (address): wallet that claimed it
- `linkedAgentId` (uint256): ERC-8004 token ID
- `createdAt` (uint256): registration timestamp
- `claimedAt` (uint256): claim timestamp

## Migration Path

- Phase 1 can ship immediately (no code)
- Phase 2 requires one PR (modify `resolveHandleToAgentId`)
- Phase 3 requires one PR (modify mention handler reply logic)
- Each phase works independently
- Phase 2 makes Phase 1 less critical over time (auto-linking fills the registry)

## Success Metrics

- % of handle-based kudos that resolve successfully (target: >80% after Phase 2)
- Number of handles registered in HandleRegistry (growing over time)
- Number of claim verifications completed (Phase 3 adoption)
- Reduction in `#id` format usage vs `@handle` format

## Open Questions

1. Should auto-linked handles (Phase 2) be flagged differently from claim-verified handles? Could add a `verified` boolean to distinguish.
2. Rate limiting on auto-registration to prevent gas drain if someone tweets kudos to hundreds of random handles?
3. Should we add `x_handle` as a recommended field in the ERC-8004 agentURI spec? Would make Phase 2 more reliable for new agents.
