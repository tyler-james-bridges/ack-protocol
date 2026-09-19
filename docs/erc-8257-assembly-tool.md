# ERC-8257 Assembly Intelligence Tool

ACK exposes AI Assembly governance as an [ERC-8257](https://eips.ethereum.org/ERCS/erc-8257) tool so agents can query member heartbeat status, council seats, voting power, and Governance proposals with x402 micropayments.

This is the implementation for [issue #38](https://github.com/tyler-james-bridges/ack-protocol/issues/38). It is a **separate tool surface** from reputation (`/api/tool`) so assembly actions stay namespaced.

## Endpoints

| Path                                     | Method | Purpose                                    |
| ---------------------------------------- | ------ | ------------------------------------------ |
| `/.well-known/ai-tool/ack-assembly.json` | GET    | ERC-8257 manifest                          |
| `/api/tool/assembly`                     | GET    | Discovery: actions + manifest URL          |
| `/api/tool/assembly`                     | POST   | Paid action handler (`withPayment`, $0.02) |
| `/api/assembly`                          | GET    | Existing unpaid council auction snapshot   |

Existing REST routes stay untouched. Query logic lives in `lib/tools/assembly-queries.ts` and reads Abstract contracts directly.

## Actions

POST `/api/tool/assembly` with JSON `{ "action": "...", ...params }`.

| Action             | Params                             | Data source                                                                                                |
| ------------------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `members`          | `status?`, `limit?`, `offset?`     | Indexer roster (or `Registered` event fallback) + Registry `members` / `isActive`                          |
| `member_detail`    | `address`                          | Registry heartbeat + CouncilSeats `ownerSeatIds`, `getVotingPower`, `isCouncilMember`                      |
| `proposals`        | `status?`, `proposalId?`, `limit?` | Governance `proposalCount` / `proposals(id)`. Empty onchain set is returned as empty, not invented.        |
| `governance_stats` | none                               | Registry counts/fees, CouncilSeats auctions (same as `GET /api/assembly`), Governance params, Forum counts |

Forum stores threads, comments, and petitions. **Binding proposals live on the Governance contract**, not Forum.

If the member indexer is down and the on-chain event scan times out, `members` returns `available: false` and `members: []` with a warning. `member_detail` and `governance_stats` still work because they do not need the roster.

## Pricing

**$0.02 USDC** per call (`20000` atomic units), matching ACK's discovery / ACP band.

The ERC-8257 manifest advertises that price on:

- **Base** — OpenSea/ERC-8257 inspect canonical rail (`eip155:8453` USDC)
- **Abstract** — ACK's existing x402 rail (`eip155:2741` USDC.e)

`POST /api/tool/assembly` is wrapped with `withPayment` on Abstract USDC. Recipient defaults to the ACK treasury (`0x668aDd9213985E7Fd613Aec87767C892f4b9dF1c`), overridable with `AGENT_WALLET_ADDRESS` or `TOOL_PAYOUT_ADDRESS`.

## Abstract contracts

| Module       | Address                                      |
| ------------ | -------------------------------------------- |
| Registry     | `0x0A013Ca2Df9d6C399F9597d438d79Be71B43cb63` |
| CouncilSeats | `0xc37cC38F4e463F50745Bdf9F306Ce6b4b6335717` |
| Forum        | `0x90095f88859ACd5f1733F44EdD509ba2e1293047` |
| Governance   | `0xe82a25937e07a3855d8B8352b85fF4B4Aa3fb0C0` |
| Treasury     | `0xC2e6DDbdc1A8e4DcCc60A78B6Faa197967a8FEb9` |

Optional `ASSEMBLY_INDEXER_URL` overrides the default member snapshot (`https://www.theaiassembly.org/api/indexer/members`).

## Onchain registration checklist (Base)

Live registration needs a funded signer whose address matches `creatorAddress`. **Do not invent or commit a private key.**

1. Ship so this URL is live:
   `https://ack-onchain.dev/.well-known/ai-tool/ack-assembly.json`
2. Dry-run locally:
   `npx tsx scripts/register-assembly-tool.ts --dry-run --local`
3. Validate the live JSON:
   `npx @opensea/tool-sdk verify https://ack-onchain.dev/.well-known/ai-tool/ack-assembly.json`
4. Set `PRIVATE_KEY` (or `AGENT_PRIVATE_KEY`) for the creator wallet. Optional: `RPC_URL`.
5. Register on Base:
   `PRIVATE_KEY=0x... npx tsx scripts/register-assembly-tool.ts --network=base`
   or
   `PRIVATE_KEY=0x... npx @opensea/tool-sdk register --metadata https://ack-onchain.dev/.well-known/ai-tool/ack-assembly.json --network base`
6. Inspect:
   `npx @opensea/tool-sdk inspect --tool-id <id> --network base`

If this environment has no key, stop after the script wiring + this checklist.

## Verify (CI / local)

```bash
# Unit tests
npx vitest run lib/__tests__/assembly.test.ts lib/tools/assembly-manifest.test.ts lib/tools/assembly-queries.test.ts lib/tools/assembly-handler.test.ts app/api/tool/assembly/route.test.ts app/.well-known/ai-tool/ack-assembly.json/route.test.ts

# Manifest dry-run (no secrets)
npx tsx scripts/register-assembly-tool.ts --dry-run --local

# Schema-validate a served or exported manifest
npx @opensea/tool-sdk validate /tmp/ack-assembly.json

# After HTTPS deploy (localhost http is rejected by the CLI path check)
npx @opensea/tool-sdk verify https://ack-onchain.dev/.well-known/ai-tool/ack-assembly.json

# After onchain registration (needs a tool ID)
npx @opensea/tool-sdk inspect --tool-id <id> --network base
```

### What this PR already ran

- Unit tests: 30 assembly + 338 total
- `npx tsc --noEmit`
- `npx tsx scripts/register-assembly-tool.ts --dry-run --local`
- `npx @opensea/tool-sdk validate` on the local well-known JSON — **Manifest is valid**
- Local `GET /.well-known/ai-tool/ack-assembly.json` (200), `GET/OPTIONS /api/tool/assembly`, unpaid `POST` **402** with amount `20000`
- Handler smoke against live Abstract RPC: `governance_stats`, `proposals` (11 real AIPs), `members` (indexer 404 → Registered events, 64 identities)

Not run here (needs secrets or a registered ID):

- Live `register-assembly-tool.ts` (no `PRIVATE_KEY`)
- `npx @opensea/tool-sdk inspect --tool-id <id>`
- `npx @opensea/tool-sdk verify` against production HTTPS (CLI requires `https://<origin>/.well-known/ai-tool/<slug>.json`; localhost http fails the path check)
