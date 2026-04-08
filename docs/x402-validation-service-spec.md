# Phone/Email Validation API (x402) — Engineering Spec

**Date:** 2026-03-30
**Status:** Draft v1
**Goal:** Ship cheap pre-check endpoints that prevent expensive downstream calls (StablePhone/StableEmail style workflows).

---

## 1) Product Definition

Paid endpoints:

1. `POST /api/v1/validate/phone`
2. `POST /api/v1/validate/email`

### Value proposition

- Validate before expensive actions.
- High ROI utility for agent workflows.
- Lightweight infra, fast to ship.

---

## 2) API Contracts

## POST /api/v1/validate/phone

### Request

```json
{ "phone": "+16025551234", "countryHint": "US" }
```

### Response (200)

```json
{
  "valid": true,
  "e164": "+16025551234",
  "type": "mobile",
  "carrier": "T-Mobile",
  "country": "US",
  "lineReachable": true
}
```

## POST /api/v1/validate/email

### Request

```json
{ "email": "founder@example.com" }
```

### Response (200)

```json
{
  "valid": true,
  "normalized": "founder@example.com",
  "mxExists": true,
  "disposable": false,
  "roleBased": false,
  "deliverable": true,
  "reason": null
}
```

### Errors

- `400` bad input
- `402` payment required
- `429` rate-limited
- `502` upstream lookup failure

---

## 3) Pricing

- Phone validation: `$0.003`
- Email validation: `$0.002`

Notes:

- Keep these ultra-cheap, high-volume endpoints.
- Can add bundle endpoint later (`/validate/contact`) at `$0.004`.

---

## 4) Provider Strategy

### Phone

- Primary: Twilio Lookup (or equivalent)
- Fallback: secondary provider for continuity

### Email

- MX + SMTP probe + disposable-domain check
- Role-based mailbox detection (info@, support@)

---

## 5) x402 Behavior

Unpaid/invalid payment:

- Return 402 with challenge

Valid payment:

- Return 200 with payload
- Include `Payment-Receipt` header

---

## 6) OpenAPI Discovery

Expose `/openapi.json` with:

- both endpoints
- per-endpoint `x-payment-info`
- explicit 402 responses
- `info.x-guidance` for agent workflows

---

## 7) Abuse & Quality Controls

- strict input normalization
- prevent provider abuse with payer-based quota
- cache positive validations (short TTL, e.g., 1h)
- store no raw PII longer than needed for logs

PII policy:

- hash identifiers in logs
- avoid persisting raw email/phone by default

---

## 8) Test Plan

1. unpaid call receives valid 402
2. paid call returns expected payload
3. invalid phone/email gets valid=false path
4. rate limits trigger correctly
5. provider outage returns deterministic 502 error envelope
6. discovery check passes

---

## 9) DoD

- both endpoints live
- paid calls verified end-to-end via AgentCash tooling
- x402scan listing live
- first 100 paid validations completed with stable latency
