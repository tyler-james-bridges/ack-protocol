# Sandboxed Code Execution API (x402) — Engineering Spec

**Date:** 2026-03-30
**Status:** Draft v1
**Goal:** Ship a low-cost, non-GPU code execution endpoint for agents that need quick transformations, scripts, and calculations.

---

## 1) Product Definition

Paid endpoint:

- `POST /api/v1/execute`

Use cases:

- run short Python/JS snippets
- transform CSV/JSON
- parse/clean data
- compute deterministic outputs for workflows

Not intended for:

- long-running jobs
- GPU/ML workloads
- persistent compute sessions

---

## 2) API Contract

## POST /api/v1/execute

### Request

```json
{
  "language": "python",
  "code": "print('hello')",
  "timeoutMs": 5000,
  "files": {
    "input.csv": "name,score\nack,100"
  }
}
```

### Response (200)

```json
{
  "stdout": "hello\n",
  "stderr": "",
  "exitCode": 0,
  "durationMs": 132,
  "files": {
    "output.json": "{\"ok\":true}"
  }
}
```

### Limits

- `language`: python | javascript | bash
- `timeoutMs`: 1000..15000 (default 5000)
- max code size: 64 KB
- max input files: 10
- max file bytes total: 1 MB
- max output bytes: 1 MB

### Errors

- `400` invalid payload
- `402` payment required
- `408` execution timeout
- `413` payload too large
- `422` disallowed operation
- `502` sandbox infra failure

---

## 3) Pricing

- Base: `$0.01` / execution (up to 5s)
- Optional tier later: `$0.02` for 15s + larger memory

---

## 4) Runtime Architecture

1. API receives request
2. x402 middleware validates payment
3. enqueue execution request to sandbox runtime
4. run in isolated container/VM
5. capture stdout/stderr/output files
6. return result + `Payment-Receipt`

### Execution backend options

- E2B (fastest integration)
- Fly Machines (isolated ephemeral VMs)
- custom Firecracker/microVM pool (later)

---

## 5) Security Model

Mandatory controls:

- no outbound network by default
- read-only runtime filesystem except temp workspace
- process/memory/CPU limits
- syscall restrictions (sandbox policy)
- kill on timeout hard-stop
- block dangerous bash builtins/commands where possible

Disallow by default:

- package installation
- privileged syscalls
- host mounts
- environment secret access

---

## 6) x402/OpenAPI Requirements

Expose `/openapi.json` with:

- `POST /api/v1/execute`
- `x-payment-info` fixed pricing
- explicit `402` response
- guidance: deterministic scripts, size/time limits

---

## 7) Observability

Track:

- paid executions count
- p50/p95 runtime
- timeout rate
- error rate by language
- average output size

Log fields (no sensitive code retention by default):

- requestId
- payer
- language
- timeout bucket
- durationMs
- exitCode

---

## 8) Test Plan

1. unpaid request returns valid 402 challenge
2. paid request executes hello-world python/js/bash
3. timeout enforcement works
4. oversize payload rejected with 413
5. disallowed operation returns 422
6. no-network policy enforced
7. discovery check passes

---

## 9) DoD

- endpoint live with payment guard
- sandbox isolation validated with security tests
- at least 20 successful paid runs in prod
- x402scan listing submitted
- docs include runnable examples
