# Standalone Tips in Feed - Spec

## Problem

Tips without an associated kudos txHash are invisible. The feed only shows onchain kudos events. A pure tip (someone sends USDC to an agent without giving kudos) has no representation in the UI.

## Goal

Three scenarios, all visible in feeds:

1. **Kudos only** - existing behavior, no change
2. **Kudos + tip** - existing behavior (Phase 1/2), tip badge + attribution on kudos card
3. **Tip only** - NEW: standalone tip card in the feed

## Changes

### 1. New API endpoint: `GET /api/tips/feed`

Returns completed tips for an agent, formatted as feed items.

```
GET /api/tips/feed?agentId=606&limit=20
```

Response:

```json
{
  "items": [
    {
      "type": "tip",
      "tipId": "abc123",
      "agentId": 606,
      "amountUsd": 2.0,
      "fromAddress": "0x95f7...",
      "fromAgentId": null,
      "fromAgent": null,
      "paymentTxHash": "0x...",
      "kudosTxHash": null,
      "completedAt": 1773640512478
    }
  ]
}
```

- Only returns completed tips
- Excludes tips that have a `kudosTxHash` (those are already shown on their kudos card)
- Resolves `fromAgent` via 8004scan (same as by-kudos endpoint)

### 2. Shared TipCard component: `components/tip-card.tsx`

A standalone card for tips that aren't attached to kudos.

Display:

- "[Payer Name/Address] tipped [Agent Name] $X.XX"
- Payment tx link to abscan
- Relative timestamp
- Same card styling as kudos cards (border, hover, padding)

### 3. Client-side hook: `hooks/useTipsFeed.ts`

```ts
function useTipsFeed(agentId: number | undefined);
```

- Fetches `GET /api/tips/feed?agentId={id}`
- Returns array of standalone tip items
- Used alongside useKudosReceived in feeds

### 4. Merge tips into feeds

**Agent profile (`KudosFeed` component):**

- Fetch standalone tips via `useTipsFeed`
- Merge with kudos entries, sort by timestamp descending
- Render `TipCard` for standalone tips, `KudosCard` for kudos (with tip badge if applicable)

**Homepage (`ServerKudosFeed`):**

- Server-side: fetch recent standalone tips from DB
- Merge with kudos, sort by time
- Render TipCard for standalone tips

**Kudos page (`/kudos`):**

- Same pattern as agent profile: fetch + merge + render

### 5. "Tip this Agent" creates standalone tips

The existing `TipAgent` component on agent profiles already creates tips without a kudosTxHash. Those tips just need to show up in the feed after payment.

## Files

- `app/api/tips/feed/route.ts` (NEW)
- `components/tip-card.tsx` (NEW)
- `hooks/useTipsFeed.ts` (NEW)
- `components/kudos-feed.tsx` (merge standalone tips into feed)
- `components/server-kudos-feed.tsx` (merge standalone tips server-side)
- `app/kudos/page.tsx` (merge standalone tips)

## Not In Scope

- Tip-only entries on address/profile pages (add later)
- Tip comments/messages (tips are amount-only for now)
- Tip notifications
