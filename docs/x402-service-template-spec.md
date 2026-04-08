# x402 Service Template / Base Definition Spec

**Date:** 2026-03-30
**Status:** Draft v1
**Scope:** Cross-project (not ETCH-specific)

---

## 1) Problem

Each new x402 service is re-implementing the same foundation:
- openapi discovery wiring
- 402 challenge/verification behavior
- well-known discovery route
- quality/security/CI checks
- launch checklist + submission payloads

This causes drift, slower shipping, and inconsistent quality.

---

## 2) Goal

Create a **distributable service template + shared core package** so new x402 services start production-ready by default.

---

## 3) Deliverables

1. `x402-service-template` (GitHub template repo)
- Next.js API skeleton
- paid + free example endpoints
- `/openapi.json`
- `/.well-known/x402`
- env schema + config docs

2. `@ack/x402-service-core` (shared package)
- `withPayment()` wrapper
- standard 402 problem response helpers
- payment receipt helpers
- logging/telemetry interfaces

3. CI Starter Workflows
- lint/type/build/test
- discovery validation (`@agentcash/discovery`)
- optional security scan (deps + secret check)

4. Launch Artifacts
- x402scan submission payload template
- receipts template
- release checklist

---

## 4) Required Opinionated Defaults

- explicit OpenAPI `x-payment-info` for paid routes
- standard `x-auth-mode` declaration per endpoint
- strict input validation middleware
- rate limiting for unpaid/paid paths
- structured logs (no secret/PII leaks)
- feature flag / kill switch per paid endpoint

---

## 5) Repo Structure (Template)

```text
src/
  app/
    .well-known/x402/route.ts
    openapi.json/route.ts
    api/v1/example-paid/route.ts
    api/v1/example-free/route.ts
  lib/
    x402.ts
    validation.ts
    observability.ts
    env.ts
.github/workflows/
  ci.yml
  discovery.yml
docs/
  launch-checklist.md
  x402scan-submission.md
```

---

## 6) Copier/Sync Strategy (Optional)

Phase 1: GitHub template + shared package only (ship fast).  
Phase 2: Add Copier sync for repo-wide standardization once at least 2 services use the template.

---

## 7) Quality Gate (Template Itself)

Template is considered done when:
- a new repo from template can deploy in <30 min
- discovery check passes without manual edits
- one paid sample endpoint works end-to-end with x402

---

## 8) Rollout Plan

1. Build template + shared core package
2. Migrate ETCH onto template conventions (as first adopter)
3. Migrate next x402 microservice (screenshot or validation)
4. Freeze standards and enable copier sync if needed

---

## 9) Why this is high leverage

This increases quality and reduces ship time across the whole x402 initiative, not just one service.

It is a force multiplier for every future API in the ecosystem.
