# Test Coverage Analysis

## Current State

The project has **10 Playwright E2E test files** (~640 lines) and **zero unit tests**. There is no unit test framework (Jest, Vitest, etc.) installed. All testing is browser-level integration testing.

### What's Currently Tested (E2E Only)

| Test File | What It Covers |
|-----------|---------------|
| `smoke.spec.ts` | Critical paths: homepage, leaderboard, agent detail, kudos page, register, docs redirect, 404, `/api/agents` endpoint |
| `homepage.spec.ts` | Hero section, search input, connect button, featured agents, links |
| `navigation.spec.ts` | Nav links, logo, mobile hamburger menu, connect button |
| `dark-mode.spec.ts` | Theme toggle, CSS class application, localStorage persistence, icon swap |
| `register.spec.ts` | Page heading, subheading, wallet connect prompt |
| `kudos.spec.ts` | Page heading, wallet prompt, description text |
| `registry.spec.ts` | Leaderboard heading, stats, sort/filter buttons, agent cards |
| `responsive.spec.ts` | Mobile hamburger, no horizontal overflow, vertical stacking |
| `agent-profile.spec.ts` | Profile loads, reputation section, URL format, chain name redirect |
| `ai-qa.spec.ts` | AI-powered visual/accessibility checks across 5 pages, console error scanning |

### E2E Test Strengths

- Good breadth across all major pages
- Mobile responsive testing across 4 routes
- AI-powered accessibility and visual regression checks
- Console error detection across core pages
- Smoke tests cover the critical user journey

### E2E Test Weaknesses

- Heavy reliance on `waitForTimeout` (hardcoded delays) instead of deterministic waits
- Some assertions are too lenient (e.g., `expect(true).toBe(true)` in `registry.spec.ts:28`)
- Tests depend on live upstream API data (8004scan), making them flaky in CI
- No mocking of API responses — tests fail if external services are down
- No authenticated flow tests (wallet connection, giving kudos, registration)

---

## Coverage Gaps — Where Tests Are Missing

### 1. No Unit Tests for Library Modules (High Priority)

These modules contain pure business logic that is trivially unit-testable. They have no dependencies on React, the DOM, or the network (or can easily be mocked).

**`lib/rate-limit.ts`** — Rate limiter with sliding window
- `checkRateLimit()`: allowing/blocking requests, remaining count, resetAt calculation
- `RateLimiter` class: custom window/max, pruning stale entries
- Edge cases: concurrent requests at limit boundary, window expiry, case-insensitive keys

**`lib/streaks.ts`** — Streak calculation engine
- `computeStreak()`: consecutive day counting, streak breaking, active today detection
- `computeLongestStreak()`: historical longest streak
- `daysBetween()` / `toUTCDateString()`: date arithmetic
- Edge cases: empty input, single day, timezone boundaries, gap of exactly 1 day vs. 2

**`lib/vouch-store.ts`** — In-memory vouch storage
- `addVouch()`: adding vouches, max limit enforcement
- `getVouches()` / `clearVouches()`: retrieval and cleanup
- `pruneExpiredVouches()`: TTL expiry after 30 days
- Edge cases: case normalization, adding beyond MAX_VOUCHES_PER_TARGET

**`lib/feedback.ts`** — ERC-8004 feedback file builder
- `buildFeedback()`: JSON construction, base64 encoding, keccak256 hashing
- Edge cases: bare kudos (empty message + no category), special characters in message, fromAgentId inclusion

**`lib/utils.ts`** — Utility functions
- `formatRelativeTime()`: "just now", "Xm ago", "Xh ago", "Xd ago", date fallback
- Edge cases: boundary values (59s, 3599s, 86399s, 604799s), future timestamps

**`lib/ipfs.ts`** — IPFS URI resolution
- `ipfsToHttp()`: `ipfs://` prefix stripping, passthrough for HTTP URLs
- Edge cases: empty string, non-IPFS URIs, malformed IPFS URIs

**`lib/home-data.ts`** — Homepage data aggregation
- `parseMessage()`: base64 data URIs, `data:,` URIs, raw JSON, malformed input
- Edge cases: nested reasoning/message fields, URL-encoded content, invalid JSON

**`lib/api.ts`** — API client utilities
- `proxyUrl()`: URL construction with query params
- `sortAgents()`: sorting by `created_at` vs. numeric fields
- `fetchAgentsByChain()`: chain filtering and testnet exclusion
- Edge cases: undefined params omission, missing items array

### 2. No Unit Tests for Config Utilities (Medium Priority)

**`config/contract.ts`**
- `toCAIP10Address()`: CAIP-10 formatting (`eip155:chainId:address`)

**`config/chains.ts`**
- `getPublicClient()`: lazy singleton creation, unsupported chain error

### 3. No API Route Integration Tests (High Priority)

All 18 API routes lack tests. These are the most impactful gaps because they handle input validation, rate limiting, authentication, and data transformation — all places where bugs are costly.

**Priority routes to test:**

**`/api/kudos` (POST)** — Gives kudos to agents
- Input validation: agentId must be positive integer, self-kudos prevention
- Rate limiting: 10/hour per agent
- SIWA authentication flow
- Category defaulting to 'reliability' for invalid values
- Response format with encoded transaction data

**`/api/agents` (GET)** — CORS proxy to 8004scan
- Path allowlisting (SSRF prevention): only `agents`, `agents/{id}/{name}/feedbacks`, `chains`
- Timeout handling (15s abort)
- Cache headers (60s max-age, 120s stale-while-revalidate)
- Error responses for blocked paths

**`/api/kudos/[txHash]` (GET)** — Fetch kudos transaction details
- Tx hash format validation (0x + 64 hex chars)
- Event log decoding from transaction receipt
- Feedback URI parsing (base64 data URIs)
- 404 for failed transactions or missing events

**`/api/vouch` (POST)** — Submit vouch for unregistered agents
- Target address validation (valid Ethereum address)
- Message validation (non-empty, max 500 chars)
- Self-vouch prevention
- Rate limiting (5/hour per agent)
- 409 when max vouches per target reached

**`/api/discover` (GET)** — Agent discovery with filtering
- Category validation against KUDOS_CATEGORIES
- Pagination (offset/limit with max 50)
- Chain ID numeric validation
- IP-based rate limiting (30/min)

**`/api/reputation/[address]` (GET)** — Aggregated reputation
- Address format validation
- Multi-page agent fetching and deduplication
- Category breakdown calculation
- IP-based rate limiting (60/min)

**`/api/siwa/nonce` + `/api/siwa/verify`** — Authentication
- Required parameter validation
- Nonce creation with onchain registration check
- Signature verification
- Error codes (NOT_REGISTERED, invalid params)

**`/api/a2a` (POST)** — Agent-to-Agent JSON-RPC
- JSON-RPC method routing
- Natural language query parsing (regex keyword extraction)
- Task store lifecycle (creation, retrieval, TTL eviction)
- Error code compliance (-32601, -32602, -32603)

**`/api/mcp` (POST)** — MCP server
- MCP protocol handshake (initialize)
- Tool call routing and response formatting
- JSON-RPC error handling

### 4. No SDK Tests (High Priority)

The `packages/sdk/` directory ships as `@ack-onchain/sdk` on npm but has **zero tests**.

- `ACK.readonly()` / `ACK.fromPrivateKey()` / `ACK.fromWalletClient()`: client construction
- `getAgent()`, `reputation()`, `feedbacks()`, `search()`, `leaderboard()`: read operations
- `register()`, `kudos()`: write operations (transaction encoding)
- `utils.ts`: `buildFeedback()`, `parseFeedbackURI()`, `ipfsToHttp()`
- `chains.ts`: chain resolution by ID or name
- `constants.ts`: category metadata integrity

### 5. No Component/Hook Tests (Medium Priority)

While E2E tests cover rendered output, there are no isolated tests for React hooks or components. The most valuable additions would be:

**Hooks:**
- `useGiveKudos`: transaction state machine (idle -> confirming -> waiting -> success/error)
- `useAgentProfile`: data composition from multiple contract reads + IPFS fetch
- `useReputationRegistry`: batch feedback decoding, category parsing

**Components (with React Testing Library):**
- `kudos-form.tsx`: form validation, submission flow
- `agent-search.tsx`: search input debouncing, results display
- `kudos-feed-item.tsx`: message parsing, relative time display

### 6. Missing Test Infrastructure

- **No unit test runner**: Need to install Vitest (recommended for Next.js/Vite) or Jest
- **No code coverage reporting**: No `istanbul`/`c8`/`vitest --coverage` configuration
- **No CI test step**: The CI workflow (`ci.yml`) runs lint, format, type-check, and build — but does **not** run any tests
- **No API mocking**: No MSW (Mock Service Worker) or similar for deterministic API tests

---

## Recommended Action Plan

### Phase 1: Foundation (add unit test infrastructure)

1. Install Vitest + `@testing-library/react` + `msw`
2. Configure `vitest.config.ts` with path aliases matching `tsconfig.json`
3. Add `test` and `test:coverage` scripts to `package.json`
4. Add test step to CI workflow

### Phase 2: Unit test pure logic (highest ROI)

Write unit tests for these modules — they are pure functions with zero dependencies:

| Module | Estimated Tests | Complexity |
|--------|----------------|------------|
| `lib/rate-limit.ts` | 10-12 | Low |
| `lib/streaks.ts` | 15-20 | Medium |
| `lib/vouch-store.ts` | 8-10 | Low |
| `lib/feedback.ts` | 6-8 | Low |
| `lib/utils.ts` | 5-6 | Low |
| `lib/ipfs.ts` | 4-5 | Low |
| `lib/home-data.ts` (`parseMessage`) | 6-8 | Low |
| `lib/api.ts` (`proxyUrl`, `sortAgents`) | 6-8 | Low |
| `config/contract.ts` (`toCAIP10Address`) | 2-3 | Low |

**Total: ~60-80 unit tests covering all pure business logic.**

### Phase 3: API route integration tests

Use `next/test` or direct handler invocation to test API routes with mocked external dependencies:

1. `/api/kudos` — validation, rate limiting, response format
2. `/api/agents` — path allowlisting, SSRF prevention
3. `/api/vouch` — validation, storage, limits
4. `/api/discover` — filtering, pagination, rate limiting
5. `/api/reputation/[address]` — aggregation logic
6. `/api/kudos/[txHash]` — tx hash validation, event decoding

### Phase 4: SDK tests

Add tests to `packages/sdk/` before publishing new versions:

1. `utils.ts` — `buildFeedback`, `parseFeedbackURI`, `ipfsToHttp`
2. `client.ts` — client construction, method routing (with mocked viem)
3. `chains.ts` — chain resolution

### Phase 5: Improve existing E2E tests

1. Replace all `waitForTimeout` calls with deterministic `waitForSelector`/`waitForResponse`
2. Fix lenient assertions (e.g., `expect(true).toBe(true)`)
3. Add API response mocking for network-independent tests
4. Add wallet-connected test scenarios (using Playwright's browser context)

---

## Summary

| Category | Current Coverage | Gap Severity |
|----------|-----------------|--------------|
| E2E / Page rendering | Good | Low |
| E2E / Responsive | Good | Low |
| E2E / Accessibility | Good (AI QA) | Low |
| Pure business logic (lib/) | **None** | **High** |
| API route validation/security | **None** | **High** |
| SDK functions | **None** | **High** |
| React hooks | **None** | Medium |
| React components | **None** | Medium |
| Test infrastructure | **Missing** | **High** |
| CI test execution | **Missing** | **High** |

The most impactful improvement is adding a unit test framework and covering `lib/` modules — this would catch logic bugs in rate limiting, streak calculation, feedback building, and vouch management that E2E tests cannot reliably exercise.
