# Tip Attribution Phase 1 - Spec

## Problem

Tips exist in the DB with `fromAddress` (payer wallet), but the UI never shows who paid. The kudos feed shows tip amount badges but no payer identity. If the payer is a registered ERC-8004 agent, we should show their agent name/profile instead of a raw address.

## Current State

- `tips` table already stores `from_address` (payer wallet)
- `TipRecord` interface has `fromAddress` field
- `server-kudos-feed.tsx` calls `getTipByKudosTxHash(k.txHash)` per kudos entry
- Only `tip.amountUsd` is passed to `FeedItem` via `tipAmountUsd` prop
- `KudosFeed` (client) has same pattern: shows `TipBadge` with amount only
- No payer identity is surfaced anywhere in the UI

## Changes

### 1. Backend: Expose payer info from tip lookup

**File: `lib/tip-store.ts`**

- Add `fromAgentId` (nullable number) to `TipRecord` and `TipRecordJSON`
- In `createTip()`: after inserting, attempt reverse lookup of `fromAddress` against the ERC-8004 registry to find if the payer is a registered agent. If found, update the record with `fromAgentId`.
- Add new exported function: `resolveAgentByWallet(address: string): Promise<number | null>` - iterates a tokenId range or uses an indexed approach to match wallet to agent. If infeasible at creation time due to cost, defer to read-time resolution.
- Alternative (simpler, preferred): resolve at read time in `getTipByKudosTxHash` by checking the registry for the `fromAddress`. Cache result in-memory (Map with TTL) to avoid repeated RPC calls.

**File: `lib/tip-store.ts` - `getTipByKudosTxHash` return shape change**

- Return object now includes `fromAddress` and `fromAgentId` (resolved lazily)

### 2. Server Feed: Pass payer identity to FeedItem

**File: `components/server-kudos-feed.tsx`**

- When tip exists, pass `tipFromAddress` and `tipFromAgentId` as additional props to `FeedItem`
- In FeedItem: if `tipFromAgentId` exists, show "Tipped by [Agent Name]" with link to agent profile
- If no agent match, show "Tipped by [truncated address]" with link to `/address/[addr]`
- Display below the TipBadge or as subtitle text under the kudos card

### 3. Client Feed: Same pattern for client-rendered feed

**File: `components/kudos-feed.tsx`**

- `KudosCard` receives optional `tipFromAddress` and `tipFromAgent` (ScanAgent) props
- If tip exists with a payer, show attribution line: "Tipped by [name/address]"
- Use existing `senderMap` / `agentMap` to resolve agent identity client-side

### 4. No new API routes needed

- Tip creation already captures `fromAddress`
- Resolution happens at render time using existing registry reads

## Data Flow

```
Tip created (POST /api/tips)
  -> stores fromAddress in DB (already works)

Kudos feed renders
  -> getTipByKudosTxHash(txHash)
  -> returns { amountUsd, fromAddress, fromAgentId? }
  -> feed component shows "Tipped by Agent #X" or "Tipped by 0xab12..."
```

## UI Design

- Payer attribution appears as a small line below or beside the TipBadge
- Format: "Tipped by [Agent Name]" (linked) or "Tipped by 0xab12...cd34" (linked)
- Uses same muted text style as existing "Submitted via ACK relay" attribution
- If payer is a registered agent, show agent avatar (16px) + name

## Testing Plan

1. Unit: `resolveAgentByWallet` returns correct agent ID for known agent wallet, null for unknown
2. Unit: `getTipByKudosTxHash` returns `fromAddress` in response
3. Integration: Create a tip with a known agent wallet as `fromAddress`, verify feed renders agent name
4. Integration: Create a tip with a non-agent wallet, verify feed renders truncated address
5. Visual: Screenshot server-rendered feed with tip attribution visible

## Files Changed

- `lib/tip-store.ts` (add fromAgentId resolution)
- `components/server-kudos-feed.tsx` (pass + render payer identity)
- `components/kudos-feed.tsx` (pass + render payer identity)

## Not In Scope (Phase 2+)

- Tip leaderboard / "top tippers" section
- Notification to agent when tipped
- Tip history page per agent
