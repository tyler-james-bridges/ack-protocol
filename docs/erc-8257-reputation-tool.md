# ERC-8257 Agent Reputation Tool

ACK exposes agent reputation as an [ERC-8257](https://eips.ethereum.org/EIPS/eip-8257) tool so other agents can query onchain reputation, feedback history, and trust scores through a standardized tool call with x402 micropayments.

This is the implementation for [issue #36](https://github.com/tyler-james-bridges/ack-protocol/issues/36). Kudos/tips (#37) is a separate tool and should register additional actions on the same `/api/tool` dispatcher — do not rewrite it.

## Endpoints

| Path                                       | Method | Purpose                                       |
| ------------------------------------------ | ------ | --------------------------------------------- |
| `/.well-known/ai-tool/ack-reputation.json` | GET    | ERC-8257 manifest                             |
| `/api/tool`                                | GET    | Discovery: registered actions + manifest URLs |
| `/api/tool`                                | POST   | Unified action handler                        |

Existing routes stay untouched. The tool imports shared query helpers in `lib/tool-queries.ts` (8004scan + `lib/feedback-cache.ts`).

## Actions

POST `/api/tool` with JSON `{ "action": "...", ...params }`.

| Action             | Params                                                              | Wraps                                          |
| ------------------ | ------------------------------------------------------------------- | ---------------------------------------------- |
| `reputation`       | `address`                                                           | `GET /api/reputation/{address}`                |
| `feedback_history` | `agentId`, `limit?`, `offset?`                                      | `GET /api/feedback?agentId=`                   |
| `discover`         | `query?`, `category?`, `chainId?`, `minScore?`, `limit?`, `offset?` | `GET /api/discover` + `GET /api/agents` search |
| `agent_info`       | `agentId` + `chainId?` or `scanId` (`2741:606`)                     | `GET /api/agents` detail                       |

Responses are normalized for agents (`trustScore`, category breakdowns, pagination). Price is advertised in the manifest; this handler is not wrapped with `withPayment` so clients and tests can call it directly. x402-capable callers pay using the manifest `pricing` array.

## Pricing

Matches ACK's $0.01–$0.02 per-call band (reputation aggregate $0.01, discovery $0.02 in ACP). The ERC-8257 manifest advertises **$0.01 USDC** per call on:

- **Base** — OpenSea/ERC-8257 inspect canonical rail (`eip155:8453` USDC)
- **Abstract** — ACK's existing x402 rail (`eip155:2741` USDC.e)

Recipient defaults to the ACK treasury (`0x668aDd9213985E7Fd613Aec87767C892f4b9dF1c`), overridable with `AGENT_WALLET_ADDRESS` or `TOOL_PAYOUT_ADDRESS`. `creatorAddress` is `TOOL_CREATOR_ADDRESS` or the same treasury.

## Extending with another tool

1. Add a handler module under `lib/tools/` that calls `registerToolAction`.
2. Add a manifest to `TOOL_MANIFESTS` in `lib/tool-manifest.ts`.
3. Add `app/.well-known/ai-tool/<name>.json/route.ts`.
4. Import the new module from `app/api/tool/route.ts` (one line).
5. Keep action names unique across tools.

## Onchain registration checklist (Base)

Live registration needs a funded signer whose address matches `creatorAddress`. **Do not invent or commit a private key.**

1. Ship so this URL is live:
   `https://ack-onchain.dev/.well-known/ai-tool/ack-reputation.json`
2. Dry-run locally:
   `npx tsx scripts/register-tool.ts --dry-run --local`
3. Validate the live JSON:
   `npx @opensea/tool-sdk verify https://ack-onchain.dev/.well-known/ai-tool/ack-reputation.json`
4. Set `PRIVATE_KEY` (or `AGENT_PRIVATE_KEY`) for the creator wallet. Optional: `RPC_URL`.
5. Register on Base (Morsel Tool #28 pattern):
   `PRIVATE_KEY=0x... npx tsx scripts/register-tool.ts --network=base`
   or
   `PRIVATE_KEY=0x... npx @opensea/tool-sdk register --metadata https://ack-onchain.dev/.well-known/ai-tool/ack-reputation.json --network base`
6. Inspect:
   `npx @opensea/tool-sdk inspect --tool-id <id> --network base`

If this environment has no key, stop after the script wiring + this checklist. Record the tool ID and tx hash in this doc once registration succeeds.

## Verify (CI / local)

```bash
# Unit tests
npx vitest run lib/__tests__/tool-queries.test.ts lib/__tests__/tool-manifest.test.ts lib/__tests__/tool-registry.test.ts app/api/tool/route.test.ts app/.well-known/ai-tool/ack-reputation.json/route.test.ts

# Manifest dry-run (no secrets)
npx tsx scripts/register-tool.ts --dry-run --local

# Schema-validate a served or exported manifest
npx @opensea/tool-sdk validate /tmp/ack-reputation.json

# After HTTPS deploy (localhost http is rejected by the CLI path check)
npx @opensea/tool-sdk verify https://ack-onchain.dev/.well-known/ai-tool/ack-reputation.json

# After onchain registration (needs a tool ID)
npx @opensea/tool-sdk inspect --tool-id <id> --network base
```

### What this PR already ran

- Unit tests: 28 passed
- `npx tsx scripts/register-tool.ts --dry-run --local`
- `npx @opensea/tool-sdk validate` on the local well-known JSON — **Manifest is valid**
- Local `POST /api/tool` against live 8004scan: `reputation`, `feedback_history`, `discover`, `agent_info` happy paths + invalid-action 400

Not run here (needs secrets or a registered ID):

- Live `register-tool.ts` (no `PRIVATE_KEY`)
- `npx @opensea/tool-sdk inspect --tool-id <id>`
- `npx @opensea/tool-sdk verify` against production HTTPS (CLI requires `https://<origin>/.well-known/ai-tool/<slug>.json`; localhost http fails the path check)
