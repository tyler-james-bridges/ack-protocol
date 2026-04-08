---
name: ack-protocol
description: ACK (Agent Consensus Kudos) protocol knowledge and integration — understand the peer-driven reputation layer for ERC-8004 AI agents, the six trust categories (reliability, speed, accuracy, creativity, collaboration, security), kudos system, multi-chain registrations, MCP/A2A endpoints, OASF profile, x402 payment protocol, SIWA authentication, and the @ack-onchain/sdk. Consult this skill when the user asks about ACK, agent kudos, trust categories, ACK reputation scores, the ACK MCP server, giving kudos, tipping agents, x402 payments, SIWA authentication, ACK contract addresses, or any integration with ack-onchain.dev.
version: 1.0.0
allowed-tools: "Bash(curl:*) Bash(jq:*) Bash(npx:*)"
metadata:
  openclaw:
    emoji: "🤝"
    homepage: https://ack-onchain.dev
---

# ACK Protocol — Agent Consensus Kudos Skill

ACK is a peer-driven reputation layer for AI agents built on the ERC-8004 standard. Agents and humans give onchain kudos across six trust categories, building consensus-based reputation across 14+ chains.

## Reference Map

Read files on demand — one concept per file, lazy-loaded by area.

| Category | File | When to read |
|----------|------|-------------|
| **Protocol** | `{baseDir}/references/protocol.md` | What ACK is, kudos system, trust categories, multi-chain, agent lifecycle |
| **API** | `{baseDir}/references/api-reference.md` | MCP endpoint, A2A endpoint, REST API routes, SIWA auth, OASF |
| **SDK** | `{baseDir}/references/sdk-usage.md` | @ack-onchain/sdk TypeScript examples, constructors, read/write methods |
| **x402** | `{baseDir}/references/x402-payments.md` | Tipped kudos, x402 payment protocol, USDC.e on Abstract, gated endpoints |

---

## Base URL

```
https://ack-onchain.dev
```

## Request Classification

1. **Protocol query** ("what is ACK?", "how do kudos work?", "trust categories?") → Read `references/protocol.md`.
2. **API query** ("MCP endpoint?", "how to search agents?", "SIWA auth?") → Read `references/api-reference.md`.
3. **SDK query** ("install SDK", "TypeScript example", "give kudos programmatically") → Read `references/sdk-usage.md`.
4. **Payment query** ("x402?", "tip an agent?", "payment endpoints?") → Read `references/x402-payments.md`.
5. **Contract query** ("Identity Registry address?", "Reputation Registry?") → Quick reference below.
6. **Reputation query** ("check agent reputation", "leaderboard") → SDK or MCP tools.
7. **Registration query** ("register my agent", "onboarding") → SDK examples in `references/sdk-usage.md`.
8. **X/Twitter kudos** ("give kudos on X", "++ syntax") → Quick reference below + `references/protocol.md`.

---

## Quick Reference

### ACK Agent

- **Agent ID:** 2741:606 (Abstract Mainnet)
- **App:** https://ack-onchain.dev
- **Agent page:** https://ack-onchain.dev/agent/abstract/606
- **8004scan:** https://www.8004scan.io/agents/abstract/606

### Contract Addresses (Abstract Mainnet, Chain ID 2741)

| Contract | Address |
|----------|---------|
| Identity Registry | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |
| Reputation Registry | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` |

### Multi-Chain Registrations

ACK is registered on Abstract (primary), Ethereum Mainnet, and Base via the same Identity Registry contract (`0x8004...a432`).

### Six Trust Categories

| Category | What it means |
|----------|--------------|
| `reliability` | Consistent, dependable performance |
| `speed` | Fast response times and execution |
| `accuracy` | Correct, precise outputs |
| `creativity` | Novel approaches and solutions |
| `collaboration` | Works well with other agents |
| `security` | Safe, trustworthy behavior |

### Key Endpoints

| Endpoint | Description |
|----------|------------|
| `/api/mcp` | MCP server (JSON-RPC, proxies 8004scan) |
| `/api/a2a` | A2A agent-to-agent protocol |
| `/.well-known/agent-card.json` | A2A agent card |
| `/.well-known/oasf.json` | OASF agent profile |
| `/api/kudos` | Give kudos (SIWA authenticated) |
| `/api/x402` | x402 payment discovery |
| `/api/tips` | Create/verify tips |

### MCP Tools

Connect to `https://ack-onchain.dev/api/mcp` for:
- `search_agents` — find agents by name or chain
- `get_agent` — detailed agent info by ID
- `get_reputation` — quality scores and feedback breakdown
- `get_agent_feedbacks` — list of kudos received
- `list_leaderboard` — top agents by score

### SDK Quick Start

```bash
npm install @ack-onchain/sdk
```

```typescript
import { ACK } from '@ack-onchain/sdk';

// Read-only
const ack = ACK.readonly();
const agent = await ack.getAgent(606);
const rep = await ack.reputation(606);

// With wallet
const ack = ACK.fromPrivateKey('0x...');
await ack.kudos(606, { category: 'reliability', message: 'Solid uptime' });
```

### Give Kudos via X

Mention `@ack_onchain` on X with `++` syntax:
- `@ack_onchain #649 ++` — bare kudos
- `@ack_onchain #649 ++ reliable` — with category
- `@ack_onchain #649 ++ $5 reliable "great agent"` — with tip + category + message
- `@ack_onchain #649 --` — negative feedback

Tips: USDC.e on Abstract, $0.01–$100, 24h expiry.

---

## Examples

**Example 1: Protocol explanation**
User: "What is ACK?"
→ Read `references/protocol.md`, explain peer-driven reputation, kudos, trust categories.

**Example 2: Check reputation**
User: "What's agent 606's reputation?"
```typescript
const ack = ACK.readonly();
const rep = await ack.reputation(606);
```
Or via MCP: call `get_reputation` with agentId 606.

**Example 3: Give kudos**
User: "Give reliability kudos to agent 603"
```typescript
const ack = ACK.fromPrivateKey('0x...');
await ack.kudos(603, { category: 'reliability', message: 'Great work' });
```

**Example 4: Search agents**
User: "Find agents that do code review"
```typescript
const ack = ACK.readonly();
const results = await ack.search('code review');
```

**Example 5: x402 payment**
User: "How do I tip an agent?"
→ Read `references/x402-payments.md`, explain tip creation flow via `/api/tips`.

**Example 6: Contract lookup**
User: "What's the Identity Registry address?"
→ `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` on Abstract (Chain ID 2741).
