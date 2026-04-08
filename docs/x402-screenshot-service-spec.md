# URL Screenshot Service (x402) — Engineering Spec

**Date:** 2026-03-30
**Status:** Draft v1
**Goal:** Ship a paid x402 endpoint that gives agents visual page rendering (PNG/JPEG), since text-only scraping is saturated.

---

## 1) Product Definition

`POST /api/v1/screenshot` (paid)
- Input: URL + viewport options
- Output: image (binary) or JSON with hosted image URL + metadata

### Why this service
- Agents can read text today, but cannot reliably assess visual/UI state.
- High utility for QA, design checks, and monitoring.
- Very low direct competition in x402 ecosystem.

---

## 2) API Contract

## POST /api/v1/screenshot

### Request JSON
```json
{
  "url": "https://example.com",
  "width": 1280,
  "height": 720,
  "fullPage": false,
  "format": "png",
  "waitUntil": "networkidle",
  "timeoutMs": 15000
}
```

### Validation Rules
- `url`: required, http/https only
- `width`: 320..2560 (default 1280)
- `height`: 240..2560 (default 720)
- `timeoutMs`: 3000..30000 (default 15000)
- `format`: png|jpeg (default png)

### Response (200, JSON mode)
```json
{
  "imageUrl": "https://cdn.yourdomain.com/screens/abc123.png",
  "width": 1280,
  "height": 720,
  "fullPage": false,
  "format": "png",
  "loadTimeMs": 842,
  "capturedAt": "2026-03-30T22:20:00.000Z"
}
```

### Response (402)
- x402 challenge + payment requirements

### Errors
- `400` invalid input
- `408` render timeout
- `422` blocked/unsupported URL
- `502` renderer failure

---

## 3) Pricing & Limits

- Price: `$0.01` / capture
- Free tier: none (optional later)
- Rate limits:
  - unpaid: 10/min/IP (challenge only)
  - paid: 60/min/payer
- Max page bytes: 10MB loaded resources (hard cap)

---

## 4) Runtime Architecture

1. API receives request
2. x402 middleware checks payment
3. Renderer worker executes Playwright capture in isolated context
4. Store image to object storage (R2/S3)
5. Return JSON payload + `Payment-Receipt`

### Deployment options
- Preferred: Railway/Fly with dedicated browser workers
- Alternative: containerized worker queue + API gateway

---

## 5) Security Controls

- Block private network URLs (SSRF prevention)
  - no localhost, 127.0.0.1, 10/8, 172.16/12, 192.168/16, link-local
- Enforce https/http only
- Disable file://, ws://, ftp://
- Hard timeout + memory cap per job
- Strip JS dialogs and permission prompts

---

## 6) OpenAPI Discovery Requirements

Expose `/openapi.json` with:
- `x-payment-info` on `POST /api/v1/screenshot`
- `responses.402`
- usage guidance for agents

Example payment stanza:
```json
"x-payment-info": {
  "pricingMode": "fixed",
  "price": "0.010000",
  "protocols": ["x402"]
}
```

---

## 7) Test Plan

1. unpaid request gets valid 402
2. paid request returns 200 with imageUrl
3. SSRF attempts are blocked (localhost/private IP)
4. timeout works on slow pages
5. format switch png/jpeg works
6. discovery validator passes

---

## 8) DoD

- live endpoint + passing integration tests
- at least 5 successful paid captures in prod
- listed on x402scan
- docs include copy/paste curl + sample output
