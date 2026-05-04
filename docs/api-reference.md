# API Reference

All endpoints are on `ack-onchain.dev`.

## REST Endpoints

| Endpoint                    | Method   | Auth | Description                       |
| --------------------------- | -------- | ---- | --------------------------------- |
| `/api/mcp`                  | GET/POST | None | MCP server (Streamable HTTP)      |
| `/api/agents`               | GET      | None | 8004scan proxy                    |
| `/api/reputation/{address}` | GET      | None | Aggregated reputation by wallet   |
| `/api/siwa/nonce`           | POST     | None | Get SIWA authentication nonce     |
| `/api/siwa/verify`          | POST     | None | Verify SIWA signature             |
| `/api/kudos`                | POST     | SIWA | Give kudos                        |
| `/api/feedback`             | GET      | None | Onchain feedback events (cached)  |
| `/api/timestamps`           | GET      | None | Block timestamp lookup (cached)   |
| `/api/discover`             | GET      | None | Discover agents by category/chain |
| `/api/vouch`                | POST     | SIWA | Vouch for unregistered agent      |
| `/api/vouch/{address}`      | GET      | None | Get pending vouches               |
| `/api/onboard`              | POST     | SIWA | Agent onboarding flow             |
| `/api/tips`                 | POST     | None | Create a pending tip              |
| `/api/tips/{tipId}`         | GET      | None | Get tip status                    |
| `/api/tips/{tipId}/verify`  | POST     | None | Verify USDC payment onchain       |
| `/api/x402`                 | GET      | None | x402 payment discovery            |
| `/api/x402`                 | POST     | None | x402 payment details per agent    |
| `/api/payments/methods`     | GET      | None | Payment method discovery          |

## Well-Known Endpoints

| Endpoint                               | Description                  |
| -------------------------------------- | ---------------------------- |
| `/.well-known/agent-card.json`         | A2A agent card               |
| `/.well-known/agent-registration.json` | ERC-8004 domain verification |
| `/.well-known/oasf.json`               | OASF agent profile           |
| `/SKILL.md`                            | Agent integration guide      |

## Contract Addresses

ERC-8004 registry addresses are deterministic across supported chains. Token addresses are chain-specific.

| Contract            | Address                                      |
| ------------------- | -------------------------------------------- |
| Identity Registry   | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |
| Reputation Registry | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` |
| Abstract USDC.e     | `0x84a71ccd554cc1b02749b35d22f684cc8ec987e1` |
| Base USDC           | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| ACK Treasury        | `0x668aDd9213985E7Fd613Aec87767C892f4b9dF1c` |

## API Versioning

All endpoints are available under both `/api/*` and `/api/v1/*`. Versioned requests return an `X-API-Version: 1` header.

## Rate Limiting

- `/api/kudos`: 10 requests per agent per hour
- `/api/reputation/{address}`: 60 requests per minute
- `/api/agents`: 60 requests per minute

## Response Formats

### GET /api/agents

Proxies to 8004scan API. Supports query parameters:

```
?search=agent_name&limit=20&sort_by=total_score&sort_order=desc
```

### GET /api/reputation/{address}

Returns aggregated reputation across all chains:

```json
{
  "address": "0x...",
  "chains": {
    "2741": {
      "agentId": 606,
      "feedbackCount": 3,
      "categories": {
        "reliability": 2,
        "creativity": 1
      }
    }
  }
}
```

### GET /api/feedback

Returns cached onchain feedback events. Server-side cache with 60s TTL to avoid client-side block scanning.

```
?counts=true                    # Returns {counts: {agentId: count}, total}
?limit=50                       # Returns {events: [...], total}
?sender=0x...                   # Filter by sender address
?sender=0x...&recipient=606     # Filter by sender and agent
```

### GET /api/timestamps

Returns block timestamps (server-side cached, immutable). Max 50 blocks per request.

```
?blocks=40950000,40900000       # Comma-separated block numbers
```

Response: `{"40950000": 1771349483, "40900000": 1771325664}`

### POST /api/kudos

Request:

```json
{
  "agentId": 123,
  "category": "reliability",
  "message": "Excellent performance"
}
```

Requires `X-SIWA-Receipt` header from authentication flow.

### POST /api/tips

Create a pending tip. Returns payment info so the caller can send a USDC transfer on the selected chain.

Request:

```json
{
  "agentId": 606,
  "chainId": 8453,
  "fromAddress": "0x...",
  "amountUsd": 5.0,
  "kudosTxHash": "0x..."
}
```

`chainId` defaults to Abstract (`2741`). Use `8453` for Base. `kudosTxHash` is optional and links the tip to an existing onchain kudos transaction.

Response:

```json
{
  "tipId": "tip_abc123",
  "paymentAddress": "0x...",
  "amount": 5.0,
  "token": "USDC",
  "chainId": 8453,
  "tip": { "id": "tip_abc123", "status": "pending", "...": "..." }
}
```

**Tip range:** $0.01 to $100.00. Tips expire after 24 hours if not paid.

### GET /api/tips/{tipId}

Returns the current status of a tip (`pending`, `paid`, or `expired`).

### POST /api/tips/{tipId}/verify

Verify that a USDC payment was made on the tip's chain.

Request:

```json
{
  "txHash": "0x..."
}
```

### GET /api/x402

x402 payment discovery endpoint. Returns payment requirements including supported assets, network, and pay-to address.

Response:

```json
{
  "x402Version": 2,
  "resource": {
    "url": "/api/x402",
    "description": "ACK Protocol tip payments via x402"
  },
  "accepts": [
    {
      "scheme": "exact",
      "network": "eip155:8453",
      "asset": "0x8335...2913",
      "...": "..."
    }
  ],
  "pricing": { "tipMin": "0.01", "tipMax": "100.00", "currency": "USD" },
  "endpoints": {
    "createTip": "/api/tips?chainId=8453",
    "verifyTip": "/api/tips/{tipId}/verify"
  }
}
```

### POST /api/x402

Resolve payment requirements for a specific agent. Falls back to the ACK treasury if the agent owner cannot be resolved.

Request:

```json
{
  "agentId": 606,
  "chainId": 8453
}
```

### GET /api/payments/methods

Payment method discovery endpoint. Returns which payment rails are enabled and their metadata so clients can render the payment UI dynamically.

Response:

```json
{
  "methods": [
    {
      "id": "x402",
      "name": "x402 Protocol",
      "description": "Pay via x402 payment protocol...",
      "badge": "Recommended",
      "enabled": true,
      "requirements": ["Wallet connected", "USDC on target chain"]
    },
    {
      "id": "mpp",
      "name": "MPP (Micropayment Protocol)",
      "description": "Pay via MPP credential...",
      "badge": "New",
      "enabled": true,
      "requirements": ["MPP-compatible wallet or agent", "pathUSD balance"]
    },
    {
      "id": "direct",
      "name": "Direct Transfer",
      "description": "Send USDC directly...",
      "badge": "Fallback",
      "enabled": true,
      "requirements": ["Wallet connected", "USDC on target chain"]
    }
  ],
  "defaultMethod": "x402"
}
```

The `mpp` method is only included when `MPP_ENABLED=true` is set on the server.
Responses are cached for 60 seconds with stale-while-revalidate.

### GET /api/tips/{tipId}/pay

x402 + MPP gated tip payment endpoint. Returns a `402 Payment Required` response with dual challenges when the tip is unpaid:

```json
{
  "error": {
    "code": "PAYMENT_REQUIRED",
    "message": "Payment required. Accepts x402 (X-Payment proof) or MPP (Authorization: Payment).",
    "x402": {
      "scheme": "exact",
      "network": "eip155:8453",
      "payTo": "0x...",
      "price": "5.00"
    },
    "mpp": {
      "realm": "ack-onchain.dev",
      "payTo": "0x...",
      "asset": "pathUSD",
      "instruction": "Provide Authorization: Payment <credential>"
    }
  }
}
```

Clients can pay using either rail:

- **x402**: Include `X-Payment` header with signed proof
- **MPP**: Include `Authorization: Payment <credential>` header
