# x402 / MPP Engineering Spec (Execution Plan)

**Date:** 2026-03-30  
**Owner:** ACK engineering  
**Status:** Draft v1 (implementation-ready)  
**Primary Goal:** Ship production x402 endpoints that fill real ecosystem gaps, validate with AgentCash discovery, and list on x402scan/MPPscan.

---

## 1) Scope and Success Criteria

### In Scope (Phase 1)
1. **ACK Reputation API behind x402** (fastest ship, highest leverage)
2. **ETCH Notarization API behind x402** (clear novelty, strong distribution)

### Out of Scope (Phase 1)
- New chain infra
- Full MPP-first optimization
- High-compute sandboxing and OCR services

### Success Criteria
- Discovery validation passes for both services (`@agentcash/discovery check`)
- Both services return valid `402` challenge and successful paid `200`
- Listed on x402scan (and MPPscan where applicable)
- First paid requests observed with receipt logging
- Public docs + copy-paste curl examples

---

## 2) Current State (Verified)

### ACK (already present)
- `GET /api/reputation/[address]` exists and returns aggregated agent reputation
- `GET /api/x402` exists but is tip-payment discovery oriented, not endpoint-level paid API flow
- `GET /api/payments/methods` exists

### Gap
- Reputation endpoint is not yet wrapped with endpoint-specific x402 payment challenge/verification
- `/openapi.json` for x402 endpoint discovery is not yet complete for paid reputation operations

---

## 3) Architecture Decisions

1. **Hybrid monetization:**
   - Keep simple lookups free
   - Gate expensive/aggregated operations behind x402

2. **Versioning:**
   - Introduce `/api/v1/reputation/*` paid routes
   - Keep existing route for compatibility

3. **Verification policy:**
   - Strict `402` for missing/invalid credentials
   - Return `Payment-Receipt` on paid success

4. **Pricing baseline (Phase 1):**
   - Reputation aggregate: **$0.01**
   - Batch reputation (5+): **$0.01**
   - ETCH notarize receipt: **$0.01**

---

## 4) Candidate A — ACK Reputation x402 Spec

## 4.1 Endpoints

### Free
- `GET /api/v1/reputation/:address/basic`
  - Returns minimal profile (agent count, score summary)

### Paid (x402)
- `GET /api/v1/reputation/:address/full`
  - Returns full cross-chain aggregate + category breakdown + metadata
- `POST /api/v1/reputation/batch`
  - Input: `{ addresses: string[] }` (max 20)
  - Output: array of full reputation payloads

## 4.2 402 Challenge Contract

For unpaid/invalid requests:
- Status: `402`
- Header: `WWW-Authenticate` with x402 challenge
- Body includes:
  - amount
  - asset
  - network
  - payTo
  - facilitator URL

For paid valid requests:
- Status: `200`
- Header: `Payment-Receipt: <opaque-receipt-id>`
- Header: `X-Payment-Protocol: x402`

## 4.3 OpenAPI Requirements

Create `GET /openapi.json` exposing:
- paid and free routes
- `x-payment-info` on paid operations
- `responses.402`
- `info.x-guidance` for agent usage

## 4.4 Data Model

```ts
interface ReputationFullResponse {
  address: string;
  aggregatedScore: number;
  totalKudos: number;
  topCategory: string | null;
  categories: Record<string, number>;
  agents: Array<{
    chainId: number;
    agentId: number;
    name: string;
    totalScore: number;
  }>;
  computedAt: string;
}
```

## 4.5 Abuse/Quota Controls

- Free endpoint: existing per-IP RL (60/min)
- Paid endpoint:
  - soft cap 120/min per payer
  - reject oversized batch > 20
  - include `Retry-After` on throttles

## 4.6 Test Plan

1. Free request works without payment
2. Paid route without credential returns valid `402`
3. Paid route with malformed credential returns `402`
4. Paid route with valid credential returns `200` + `Payment-Receipt`
5. Discovery check passes
6. Batch returns deterministic order and partial failures are explicit

## 4.7 DoD

- x402scan listing live
- 3 successful paid calls with logged receipts
- docs page updated (`docs/api-reference.md` + usage examples)

---

## 5) Candidate B — ETCH Notarize x402 Spec

## 5.1 Endpoint

### Paid
- `POST /api/v1/notarize`

Input:
```json
{
  "data": "string",
  "type": "receipt|attestation",
  "soulbound": false
}
```

Output:
```json
{
  "tokenId": "123",
  "txHash": "0x...",
  "dataHash": "0x...",
  "timestamp": "2026-03-30T...Z",
  "explorerUrl": "https://abscan.org/tx/...",
  "tokenUrl": "https://etch.ack-onchain.dev/token/123"
}
```

### Free
- `GET /api/v1/notarize/verify?dataHash=0x...`

## 5.2 Behavior

- Server computes `keccak256(data)`
- Mints ETCH token embedding dataHash metadata
- Returns tx + token references
- If mint fails, return `502` with deterministic error code

## 5.3 Pricing
- Notarize: `$0.01`
- Optional soulbound variant can be introduced later (`$0.02`)

## 5.4 Test Plan

1. Unpaid notarize returns `402`
2. Paid notarize returns `200` and mints token
3. `dataHash` in response matches deterministic local hash
4. Verify endpoint confirms existence by hash
5. Discovery validation passes

## 5.5 DoD

- 1 successful paid notarization in production
- tx + token proof posted
- listed on x402scan

---

## 6) Shared Implementation Tasks

1. Build reusable x402 middleware wrapper:
   - `requireX402Payment(routeConfig)`
   - emits challenge + verifies credential + decorates request context

2. Shared payment config module:
   - network
   - asset
   - facilitator
   - payTo resolver

3. Receipt logger:
   - requestId
   - route
   - payer
   - amount
   - asset
   - tx/receipt id
   - latency

4. Observability:
   - success rate
   - 402 rate
   - paid call count
   - p95 latency

---

## 7) Execution Plan (5-day)

### Day 1
- Reputation paid route scaffolding
- x402 middleware + challenge + verify path
- `/openapi.json` v1

### Day 2
- Reputation batch route
- tests (unit + integration)
- discovery validation + fixes

### Day 3
- ETCH notarize endpoint scaffolding
- payment guard + mint path

### Day 4
- ETCH verify endpoint
- ETCH discovery doc + tests
- production dry run

### Day 5
- x402scan registration(s)
- receipts post + docs polish
- monitor first paid traffic

---

## 8) Risks and Mitigations

1. **Credential verification edge cases**
   - Mitigation: strict schema validation + clear 402 errors + replay tests

2. **Mint latency and chain congestion (ETCH)**
   - Mitigation: async job mode fallback (return accepted + poll endpoint)

3. **Rate-limit abuse on free endpoints**
   - Mitigation: tighter free RL and progressive throttling

---

## 9) Immediate Next Step

Start with **Candidate A (Reputation x402)** in ACK repo:
- create `/api/v1/reputation/:address/full`
- add x402 middleware
- publish `/openapi.json`
- run `npx @agentcash/discovery check https://ack-onchain.dev`

This is the fastest path to a real listing and paid usage signal.
