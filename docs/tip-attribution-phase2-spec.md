# Tip Attribution Phase 2 - Spec

## Problem

Tip attribution (badge + "Tipped by [agent/address]") works on the homepage and agent profile feeds, but is missing from every other page that shows kudos. Tips given by a wallet are also not tracked anywhere on profiles.

## Current State

- Homepage (`/`) - tip badge + attribution via ServerKudosFeed
- Agent profile (`/agent/[chain]/[id]`) - tip badge + attribution via KudosFeed + useTipsForKudos hook
- Kudos page (`/kudos`) - NO tip data. Uses its own RecentKudosCard component
- Address profile (`/address/[address]`) - NO tip data. Shows kudos given/received but no tips
- Profile page (`/profile`) - NO tip data. Shows kudos given/received but no tips
- Individual kudos (`/kudos/[txHash]`) - NO tip data. Shows kudos details only

## Changes

### 1. Kudos Page (`/kudos/page.tsx`)

The page has its own `RecentKudosCard` component (not shared with other feeds).

**Changes:**

- Import and use `useTipsForKudos` hook (already exists in `kudos-feed.tsx`)
- Extract `useTipsForKudos` to a shared hook file: `hooks/useTipsForKudos.ts`
- Add `tipAmountUsd`, `tipFromAddress`, `tipFromAgent` props to RecentKudosCard
- Render TipBadge + "Tipped by" line (same pattern as KudosCard in kudos-feed.tsx)
- Pass tip data when mapping kudos entries

### 2. Address Profile (`/address/[address]/page.tsx`)

Shows "Kudos Given" and "Kudos Received" sections. Has its own card components inline.

**Changes:**

- Import `useTipsForKudos` shared hook
- Fetch tips for all kudos txHashes shown (given + received)
- Add tip badge + attribution to both the given and received card components
- Add a "Tips Given" summary stat to the profile header (total USD tipped)
- The "Tips Given" count requires a new lightweight endpoint or client-side aggregation from the tip lookup

### 3. Profile Page (`/profile/page.tsx`)

Connected wallet's own profile. Similar structure to address page.

**Changes:**

- Import `useTipsForKudos` shared hook
- Add tip badge + attribution to KudosCard components in both "Kudos Received" and "Kudos Given" sections
- Add "Tips Given" stat alongside existing "Kudos Given" count

### 4. Individual Kudos Page (`/kudos/[txHash]/page.tsx`)

Single kudos detail view. Client-side, fetches from `/api/kudos/[txHash]`.

**Changes:**

- After loading kudos data, fetch tip for this txHash: `POST /api/tips/by-kudos` with single hash
- If tip exists, show a "Tip" section with: amount, payer identity (agent name or address), payment tx link
- Style as an additional info row below existing kudos details

### 5. Shared Hook Extraction

**New file: `hooks/useTipsForKudos.ts`**

- Move `TipFromAgent`, `TipInfo`, and `useTipsForKudos` from `components/kudos-feed.tsx` to shared hook
- Update `components/kudos-feed.tsx` to import from hook
- All other pages import from same hook

## Data Flow

```
Any page with kudos entries
  -> collect txHashes
  -> useTipsForKudos(txHashes) hook
  -> POST /api/tips/by-kudos { txHashes }
  -> returns { tips: { [hash]: { amountUsd, fromAddress, fromAgentId, fromAgent } } }
  -> render TipBadge + "Tipped by" for matching entries
```

## Files Changed

- `hooks/useTipsForKudos.ts` (NEW - shared hook)
- `components/kudos-feed.tsx` (refactor - import shared hook)
- `app/kudos/page.tsx` (add tip data to RecentKudosCard)
- `app/address/[address]/page.tsx` (add tip data to both card types)
- `app/profile/page.tsx` (add tip data to KudosCard sections)
- `app/kudos/[txHash]/page.tsx` (add tip section to detail view)

## UI Consistency

Every place a kudos entry renders, if a completed tip is linked:

1. Show the green `$X.XX` TipBadge next to the timestamp
2. Show "Tipped by [Agent Name]" (linked) or "Tipped by 0xab12..." (linked) below the message
3. Same text size, color, and style as existing attribution lines

## Testing Plan

1. Kudos page: verify tip badge + attribution visible on tipped entries
2. Address profile: verify tips show in both given/received sections
3. Profile page: verify tips show for connected wallet's kudos
4. Individual kudos: verify tip details appear on detail page for tipped kudos
5. Non-tipped kudos: verify no tip UI renders (no empty badges or "Tipped by" lines)
6. Cross-check: same tip shows consistently across all views

## Not In Scope

- Tip leaderboard / "top tippers"
- Tip history page
- Tip notifications
- Tips given/received aggregate stats (Phase 3)
