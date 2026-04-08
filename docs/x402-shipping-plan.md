# x402 / MPP Shipping Plan (Execution Order)

**Date:** 2026-03-30  
**Goal:** Ship the 5 prioritized APIs with production quality and measurable adoption.

---

## 1) Build Order (Opinionated)

## Wave 1 (This Week, fastest signal)
1. **ACK Reputation x402**
2. **ETCH Notarization x402**

Why first: lowest implementation risk, highest strategic fit, immediate listing potential.

## Wave 2 (Next 1-2 weeks, ecosystem utility)
3. **URL Screenshot service**
4. **Phone/Email validation service**

Why second: broader utility, straightforward monetization, minimal protocol risk.

## Wave 3 (Week 3+, infra-sensitive)
5. **Code Sandbox execution**

Why third: highest security burden, needs stricter isolation and abuse controls.

---

## 2) Dependency Map

- Shared x402 middleware (challenge + verify + receipt) is a dependency for all paid routes.
- Shared `/openapi.json` generation pattern is a dependency for discovery/listing.
- Shared observability schema (paid calls, 402s, latency) should be in place before Wave 2.
- Sandbox isolation hardening is a hard dependency before enabling public execution endpoint.

---

## 3) Day-by-Day Plan (10 working days)

## Days 1-2: Reputation
- implement `/api/v1/reputation/:address/full` (paid)
- implement `/api/v1/reputation/:address/basic` (free)
- implement `/api/v1/reputation/batch` (paid)
- add x402 openapi metadata
- run discovery validation

## Days 3-4: ETCH Notarize
- implement `POST /api/v1/notarize` (paid)
- implement `GET /api/v1/notarize/verify` (free)
- return tx + token references
- discovery validation

## Day 5: Launch Wave 1
- submit x402scan registration for both
- run paid smoke tests from AgentCash tooling
- publish receipts + docs

## Days 6-7: Screenshot service
- service scaffolding + renderer worker
- SSRF/network protections
- storage + signed URLs
- discovery validation

## Days 8-9: Validation service
- phone endpoint
- email endpoint
- provider fallback + caching
- discovery validation

## Day 10: Launch Wave 2
- x402scan registration
- announce with receipts and pricing
- collect first paid usage metrics

---

## 4) Quality Gates (must pass before each launch)

1. **Protocol correctness**
- unpaid => valid 402 challenge
- paid valid => 200 + Payment-Receipt
- invalid credential => 402 (not 500)

2. **Discovery correctness**
- `npx @agentcash/discovery check <url>` passes
- openapi has `x-payment-info` and explicit 402 responses

3. **Security baseline**
- input schema validation
- route-specific abuse limits
- no secret leakage in responses/logs

4. **Ops baseline**
- p95 latency captured
- paid call counter and error rate dashboards
- rollback switch/feature flag available

---

## 5) Acceptance Metrics

## Wave 1 success
- 2 endpoints listed on x402scan
- >=100 paid calls in 7 days
- >=99% successful paid request rate

## Wave 2 success
- >=500 paid calls in 14 days
- screenshot p95 < 5s
- validation endpoints combined error rate < 1.5%

## Wave 3 success
- zero critical sandbox escapes in testing
- >=20 paid sandbox runs with stable performance

---

## 6) Non-negotiables

- Never ship an endpoint without passing discovery validation.
- Never claim paid support without end-to-end paid test proof.
- Never open sandbox endpoint without network and syscall restrictions.

---

## 7) Immediate Next Action

Start coding **Wave 1 / Day 1** in ACK repo with a feature branch:
`feat/x402-reputation-v1`

Then ship in this exact order:
1) full paid route
2) basic free route
3) batch paid route
4) openapi + discovery pass
5) production smoke + listing
