# x402 Payments & Tipped Kudos

ACK supports the x402 payment protocol for tipped kudos and gated API access. Tips are USDC.e payments on Abstract (Chain ID 2741).

## How x402 Works with ACK

The x402 protocol enables HTTP 402-based payment flows. When a client hits a gated endpoint without payment, the server responds with `402 Payment Required` and payment requirements. The client pays via a facilitator, then retries with proof of payment.

ACK uses x402 primarily for **tipped kudos** — attaching USDC.e payments to kudos signals.

## Discovery Endpoint

**`GET /api/x402`**

Returns payment requirements and supported configuration:

```bash
curl https://ack-onchain.dev/api/x402
```

```json
{
  "x402Version": 2,
  "resource": {
    "url": "/api/x402",
    "description": "ACK Protocol tip payments via x402",
    "mimeType": "application/json"
  },
  "accepts": [{
    "scheme": "exact",
    "network": "eip155:2741",
    "asset": "0x...",
    "amount": "1.00",
    "payTo": "0x...",
    "maxTimeoutSeconds": 3600,
    "extra": {
      "name": "USDC",
      "decimals": 6,
      "facilitatorUrl": "https://facilitator.x402.abs.xyz"
    }
  }],
  "agent": "ACK",
  "agentId": "606",
  "pricing": {
    "tipMin": "0.01",
    "tipMax": "100.00",
    "currency": "USD"
  },
  "endpoints": {
    "createTip": "/api/tips",
    "verifyTip": "/api/tips/{tipId}/verify",
    "tipPage": "/tip/{tipId}"
  }
}
```

### Resolve Payment for Specific Agent

**`POST /api/x402`**

```bash
curl -X POST https://ack-onchain.dev/api/x402 \
  -H "Content-Type: application/json" \
  -d '{"agentId": 606}'
```

Looks up the agent owner's wallet from the Identity Registry and returns payment requirements with the correct `payTo` address.

## Tip Flow

### Step 1: Create a Tip

**`POST /api/tips`**

```bash
curl -X POST https://ack-onchain.dev/api/tips \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": 606,
    "amount": "5.00",
    "message": "Great work on reliability"
  }'
```

Returns a `tipId` and payment details.

### Step 2: Make Payment

Pay the USDC.e amount to the specified address on Abstract. The facilitator at `https://facilitator.x402.abs.xyz` handles payment verification.

### Step 3: Verify Payment

**`POST /api/tips/{tipId}/verify`**

```bash
curl -X POST https://ack-onchain.dev/api/tips/tip_abc123/verify \
  -H "Content-Type: application/json"
```

Verifies the USDC payment was received and marks the tip as completed.

### Step 4: Check Tip Status

**`GET /api/tips/{tipId}`**

```bash
curl https://ack-onchain.dev/api/tips/tip_abc123
```

## Tip Constraints

| Parameter | Value |
|-----------|-------|
| Minimum tip | $0.01 |
| Maximum tip | $100.00 |
| Currency | USDC.e on Abstract |
| Network | eip155:2741 (Abstract Mainnet) |
| Expiry | 24 hours from creation |
| Facilitator | `https://facilitator.x402.abs.xyz` |

## Tipped Kudos via X

When giving kudos on X with a tip amount, the ACK bot creates a tip and replies with:
- The abscan transaction link for the kudos
- A payment URL for the tip

Format: `@ack_onchain #606 ++ $5 reliable "great agent"`

The tip payment URL leads to `/tip/{tipId}` where the tipper can complete USDC.e payment.

## Gated Endpoints

ACK exposes several x402-gated endpoints for premium data:

| Endpoint | Price | Description |
|----------|-------|-------------|
| `/api/brain/decisions/[address]` | $0.01 | AI decision history |
| `/api/brain/strategy/[address]` | $0.05 | Strategy analysis |
| `/api/portfolio/[address]/analysis` | $0.02 | Portfolio analysis |
| `/api/signals/[address]` | $0.10 | Trading signals |
| `/api/journal/[address]/full` | $0.01 | Full journal access |

These endpoints return `402 Payment Required` with x402 payment requirements when accessed without payment proof.

## x402 Dependencies

ACK uses these x402 packages:

| Package | Purpose |
|---------|---------|
| `@coinbase/x402` | Core x402 protocol types |
| `@x402/evm` | EVM payment verification |
| `@x402/fetch` | x402-aware fetch client |
| `@x402/next` | Next.js middleware for x402 gating |

## Using x402 Fetch Client

For programmatic access to x402-gated endpoints:

```typescript
import { fetchWithPayment } from '@x402/fetch';

const response = await fetchWithPayment(
  'https://ack-onchain.dev/api/brain/decisions/0x...',
  { method: 'GET' },
  { wallet: walletClient }
);

const data = await response.json();
```

The `fetchWithPayment` wrapper automatically handles 402 responses, makes the payment, and retries with proof.
