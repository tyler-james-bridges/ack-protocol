# x402 Production Quality Gates Checklist

Use this checklist before enabling any paid endpoint.

## A) Protocol + Payment

- [ ] Unpaid call returns HTTP 402
- [ ] 402 response includes valid challenge payload
- [ ] Paid call with valid credential returns HTTP 200
- [ ] Response includes `Payment-Receipt` header
- [ ] Invalid/malformed credential returns 402 (not 5xx)

## B) Discovery + OpenAPI

- [ ] Endpoint appears in `/openapi.json`
- [ ] `x-payment-info` includes pricing + protocols
- [ ] `responses.402` documented
- [ ] `info.x-guidance` present
- [ ] `npx @agentcash/discovery check <url>` passes

## C) Security

- [ ] Input schema validation in place
- [ ] Rate limits for unpaid and paid calls
- [ ] No internal errors/secrets exposed in response body
- [ ] Abuse scenarios tested (oversize payload, invalid params)
- [ ] Service-specific controls verified (SSRF, sandbox restrictions, etc.)

## D) Reliability

- [ ] p95 latency measured and acceptable
- [ ] Error rate measured under load test
- [ ] Retries/timeouts configured for upstream dependencies
- [ ] Feature flag / kill switch available

## E) Observability

- [ ] paid_calls_total metric
- [ ] payment_402_total metric
- [ ] payment_verify_fail_total metric
- [ ] endpoint latency histogram
- [ ] structured logs include requestId + route + status (without sensitive payload)

## F) Launch Readiness

- [ ] Docs updated with copy/paste examples
- [ ] At least 3 successful paid prod calls recorded
- [ ] x402scan submission prepared
- [ ] Rollback plan documented

---

## Release Decision Rule

- If any box in A or B is unchecked: **Do not ship**.
- If any box in C is unchecked: **Do not ship**.
- If D/E/F have gaps: ship only behind a constrained beta flag.
