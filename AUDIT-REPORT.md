# ACK Protocol Audit Report

**Date:** 2026-02-26
**Current Score:** 76.98 (Rank #342, Chain Rank #4 on Abstract)
**Target:** 87+ (matching Captain Dackie & Meerkat Rick)
**Gap:** ~10.3 points

---

## Score Breakdown Comparison

| Dimension   | Weight | ACK   | Dackie (87) | Rick (87) | Gap        |
| ----------- | ------ | ----- | ----------- | --------- | ---------- |
| **Service** | 0.25   | **0** | 100         | 100       | **-100**   |
| Engagement  | 0.30   | 39.2  | 81.2        | 54.0      | -15 to -42 |
| Publisher   | 0.20   | 14.3  | 49.0        | 82.8      | -35 to -69 |
| Compliance  | 0.15   | 60.0  | 54.2        | 60.0      | +0 to +6   |
| Momentum    | 0.10   | 43.2  | 18.8        | 19.5      | +24        |

**The no_service_penalty (0.65x multiplier) is being applied to ACK.** This alone is costing ~12 points.

---

## CRITICAL — Blocking Score Improvement

### 1. Service Dimension Score is 0 (worth 25 points!)

Despite having MCP and A2A endpoints, 8004scan gives ACK a **service score of 0**:

- `mcp_quality: 0` — 8004scan sees **0 tools** in MCP
- `a2a_quality: 0` — 8004scan sees **0 skills** in A2A
- `health_status: null` — health checks aren't running

**Root Cause:** 8004scan's health checker likely calls the MCP endpoint with `tools/list` and expects tools to be returned in the crawled/indexed data. But looking at the 8004scan response, `services.mcp.tools: []` and `services.a2a.skills: []` — the scanner is NOT picking up your tools/skills.

**Compare with Dackie:** `mcp_quality: 20` (tools listed), `a2a_quality: 100` (14 skills, has_version, has_description). Rick has `mcp_quality: 97` (19 tools, prompts), `a2a_quality: 100` (11 skills).

**Fix:**

1. **MCP:** Ensure the health check probe (likely a GET or POST to `/api/mcp`) returns tool metadata. The GET handler returns tool names but not the full schema. The POST `tools/list` works, but 8004scan may be doing a GET crawl. Check if 8004scan expects `tools/list` response format on GET, or if it uses the `initialize` → `tools/list` handshake. Add tools array to the GET response with full inputSchema.
2. **A2A:** The agent card at `/.well-known/agent-card.json` has skills but they lack the `id` field format 8004scan expects. The A2A agent card should include version at the top level (you have it). Check that 8004scan's A2A crawler can reach the endpoint. The `services.a2a.skills: []` suggests the skills aren't being parsed.
3. **Trigger re-crawl** after fixes — 8004scan re-indexes periodically but you may need to wait or request a manual refresh.

**Impact:** Fixing this alone could add **+25 points** (service dimension) and remove the **0.65x penalty**, potentially pushing score from 77 → 90+.

### 2. No Service Penalty Applied (0.65x multiplier)

The `no_service_penalty_applied: true` flag means 8004scan considers ACK as having NO working services. This multiplies the final score by 0.65. Your raw score before penalty is higher than 77.

**Fix:** Same as #1 — get MCP/A2A health checks passing.

---

## HIGH — Differentiating Features

### 3. Wallet Score is Very Low (8.25 vs Dackie's 43, Rick's 77)

The publisher wallet `0x668add9213985e7fd613aec87767c892f4b9df1c` has a low wallet score. This feeds into the publisher dimension (weight 0.20).

**Fix:**

- Fund the wallet with more ETH/tokens to show activity
- Make more onchain transactions (swaps, interactions, ENS registration)
- Rick's wallet has ENS + 50 txns → score 77
- An ENS name for the wallet would help significantly

**Impact:** +5-15 points on publisher dimension

### 4. Engagement/Popularity is Low (26.4 popularity, 10 feedbacks)

Dackie has 4012 stars and 44 feedbacks. ACK has 2 stars and 10 feedbacks.

**Fix:**

- Get more agents/users to give kudos to ACK (ironic given ACK IS the kudos system)
- Star the agent on 8004scan
- Submit more diverse feedback (different wallets, categories)
- Engage other agent communities for cross-feedback

**Impact:** +10-20 points on engagement dimension

### 5. Add `supported_trust_models` Beyond Just "reputation"

Dackie and Rick both list `["reputation", "crypto-economic", "tee-attestation"]`. ACK only has `["reputation"]`.

**Fix:** Add crypto-economic and tee-attestation trust model declarations to metadata if applicable.

### 6. OASF Skills/Domains Are Non-Standard

8004scan flags ALL your OASF skills and domains as unknown:

```
Unknown skill: 'natural_language_processing/information_retrieval_synthesis/search'
Unknown domain: 'technology/blockchain'
```

**Fix:** Use the standard OASF taxonomy. Rick uses correct paths like:

- `natural_language_processing/natural_language_understanding/contextual_comprehension`
- `technology/software_engineering/web_development`

Your slugs use slashes differently (`natural/language/processing/...` vs `natural_language_processing/...`). The route.ts has the slash format but 8004scan indexes underscore format. **There's a mismatch between what oasf.json/route.ts returns and what 8004scan indexes.** Check if 8004scan is transforming slugs or if the onchain metadata has different values.

**Impact:** Cleaner parse, potentially better compliance score

---

## MEDIUM — Polish & Completeness

### 7. Endpoint Verification Failing

`is_endpoint_verified: false` and no verification has been attempted. 8004scan has an endpoint verification system.

**Fix:** Complete endpoint verification through 8004scan's verification flow (likely DNS TXT record or meta tag). This adds to compliance score.

### 8. Tags and Categories Are Empty

Both `tags: []` and `categories: []` in the 8004scan data.

**Fix:** Add tags to your onchain metadata: `["reputation", "trust", "kudos", "erc-8004", "abstract"]`

### 9. MCP Prompts and Resources Not Returned to Scanner

Your MCP lists prompts and resources in the code, but 8004scan shows `prompts: []` and `resources: []`. Rick shows `prompts_count: 2`.

**Fix:** Ensure the prompts/list and resources/list responses are being picked up by the scanner. May need to return them in the GET response or ensure the scanner's probe sequence hits them.

### 10. A2A Agent Card Skills Missing `id` and Proper Format

The A2A agent-card.json has skills but 8004scan shows `skills: []`. Dackie's skills have proper structure that 8004scan parses. Compare your agent card format against the A2A spec — skills may need `id`, `name`, `description` fields that match what the scanner expects.

### 11. Homepage Returns Almost No Content

`web_fetch` of https://ack-onchain.dev returns just the title "ACK - Service Reputation for the Machine Economy" — nearly empty. This is likely a React SPA issue (no SSR content for crawlers).

**Fix:** Add proper server-side rendering or static content that crawlers can read. Important for SEO and any web crawling score components.

---

## LOW — Nice-to-Haves

### 12. Add Email Service

Dackie lists an email endpoint (`dackie@capminal.ai`). This is another supported protocol.

### 13. Cross-Chain Registrations

ACK is already on 3 chains (Abstract 2741, Ethereum 1, Base 8453) with cross-chain links — good. Continue maintaining parity.

### 14. Activity Score Could Be Higher

Current activity score is 35 (Dackie: 10, Rick: 10). ACK is actually ahead here. Keep the momentum with regular onchain activity.

### 15. Add Streaming Support to A2A

Both competitors have `streaming: false` but this could be a differentiator if enabled.

---

## Priority Action Plan

| Priority | Action                             | Est. Impact | Effort     |
| -------- | ---------------------------------- | ----------- | ---------- |
| 🔴 P0    | Fix MCP so 8004scan detects tools  | +15-25 pts  | 1-2 hrs    |
| 🔴 P0    | Fix A2A so 8004scan detects skills | +10-15 pts  | 1-2 hrs    |
| 🟠 P1    | Fix OASF skill/domain taxonomy     | +2-5 pts    | 30 min     |
| 🟠 P1    | Fund wallet + ENS name             | +5-15 pts   | 30 min + $ |
| 🟡 P2    | Get more feedbacks/stars           | +5-10 pts   | Ongoing    |
| 🟡 P2    | Complete endpoint verification     | +2-5 pts    | 30 min     |
| 🟡 P2    | Add tags/categories to metadata    | +1-3 pts    | 15 min     |
| 🟢 P3    | SSR for homepage                   | +0-2 pts    | 1-2 hrs    |
| 🟢 P3    | Add trust models to metadata       | +0-2 pts    | 15 min     |

**Bottom line:** The #1 blocker is that 8004scan thinks ACK has NO working services. Fix the MCP/A2A health check responses and the score should jump from 77 to 85-90+ immediately. Everything else is incremental.
