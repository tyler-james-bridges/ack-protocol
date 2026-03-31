#!/usr/bin/env node
/**
 * ACK Health Checker (Multi-Chain)
 * Checks live ERC-8004 agent endpoints and submits data-driven onchain feedback.
 *
 * Usage:
 *   node lib/ack-health-checker.mjs --dry-run                 # preview without sending txs
 *   node lib/ack-health-checker.mjs --limit 3                 # check up to 3 agents
 *   node lib/ack-health-checker.mjs --agent-ids 655,661       # check specific agents
 *   node lib/ack-health-checker.mjs --chain abstract          # check Abstract agents (default)
 *   node lib/ack-health-checker.mjs --chain base --limit 3    # check Base agents
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';

// --- Chain Config ---
export const CHAINS = {
  abstract: {
    name: 'Abstract',
    chainId: 2741,
    rpc: 'https://api.mainnet.abs.xyz',
    ackAgentId: 606,
    explorer: 'https://abscan.org/tx',
  },
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://mainnet.base.org',
    ackAgentId: 19125,
    explorer: 'https://basescan.org/tx',
  },
  eth: {
    name: 'Ethereum',
    chainId: 1,
    rpc: 'https://eth.llamarpc.com',
    ackAgentId: 26424,
    explorer: 'https://etherscan.io/tx',
  },
};

// --- Config ---
const REPUTATION_REGISTRY = '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63';
const SCAN_API = 'https://www.8004scan.io/api/v1/public';
const STATE_FILE = new URL('../memory/ack-health-state.json', import.meta.url)
  .pathname;
const TAG1 = 'health-check';
const VALUE_DECIMALS = 0;
const ENDPOINT_TIMEOUT_MS = 10_000;
const RECHECK_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_AGENTS_PER_RUN = 5;
const PROTOCOLS_TO_CHECK = new Set(['WEB', 'A2A', 'MCP']);

// --- Args ---
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const requestedLimit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : 3;
const limit = Number.isFinite(requestedLimit)
  ? Math.min(requestedLimit, MAX_AGENTS_PER_RUN)
  : 3;
const agentIdsIdx = args.indexOf('--agent-ids');
const specificIds =
  agentIdsIdx !== -1
    ? args[agentIdsIdx + 1].split(',').map(Number).filter(Number.isFinite)
    : null;
const chainIdx = args.indexOf('--chain');
const chainKey =
  chainIdx !== -1 ? args[chainIdx + 1].toLowerCase() : 'abstract';

if (!CHAINS[chainKey]) {
  console.error(`Unknown chain: ${chainKey}. Use: abstract, base, eth`);
  process.exit(1);
}

const chain = CHAINS[chainKey];

// --- State ---
function loadState() {
  if (!existsSync(STATE_FILE)) {
    return { checked: {}, lastRun: null, totalChecks: 0 };
  }
  return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
}

function saveState(state) {
  const dir = STATE_FILE.replace(/\/[^/]+$/, '');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// --- 8004scan API ---
function getScanApiKey() {
  if (process.env.SCAN_API_KEY) return process.env.SCAN_API_KEY;
  try {
    return execSync(
      'security find-generic-password -s openclaw-8004scan-api-key -w',
      {
        encoding: 'utf-8',
        timeout: 5000,
        shell: '/bin/zsh',
        stdio: ['ignore', 'pipe', 'ignore'],
      }
    ).trim();
  } catch {
    return null;
  }
}

async function fetchScanJson(pathname, apiKey) {
  const headers = {};
  if (apiKey) headers['X-API-Key'] = apiKey;

  const res = await fetch(`${SCAN_API}${pathname}`, { headers });
  if (!res.ok) {
    throw new Error(`8004scan returned ${res.status} for ${pathname}`);
  }
  return res.json();
}

async function fetchAgents(tokenIds, apiKey) {
  const results = [];
  for (const id of tokenIds) {
    try {
      const json = await fetchScanJson(
        `/agents/${chain.chainId}/${id}`,
        apiKey
      );
      if (json?.data) results.push(json.data);
      else results.push(json);
    } catch (e) {
      console.log(`  [SKIP] Agent ${id}: ${e.message}`);
    }
  }
  return results;
}

async function fetchChainAgents(fetchLimit = 100, apiKey) {
  const json = await fetchScanJson(
    `/agents?chain_id=${chain.chainId}&is_testnet=false&limit=${fetchLimit}`,
    apiKey
  );
  return json?.data || json?.items || [];
}

async function fetchAgentDetail(tokenId, apiKey) {
  // Try 8004scan API first
  try {
    const detail = await fetchScanJson(
      `/agents/${chain.chainId}/${tokenId}`,
      apiKey
    );
    if (detail?.services) return detail;
  } catch {
    /* fall through */
  }

  // Fallback: read onchain tokenURI for service endpoints
  try {
    const raw = execSync(
      `cast call 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 'tokenURI(uint256)(string)' ${tokenId} --rpc-url ${chain.rpc}`,
      {
        encoding: 'utf-8',
        timeout: 15000,
        shell: '/bin/zsh',
        stdio: ['ignore', 'pipe', 'ignore'],
      }
    )
      .trim()
      .replace(/^"|"$/g, '');

    const b64 = raw.replace('data:application/json;base64,', '');
    const decoded = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
    return {
      token_id: tokenId,
      services: decoded.services || null,
      name: decoded.name,
    };
  } catch {
    return null;
  }
}

// --- Service Parsing ---
function normalizeProtocol(value) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function getEndpointValue(service) {
  if (!service || typeof service !== 'object') return null;

  const candidates = [
    service.endpoint,
    service.url,
    service.uri,
    service.base_url,
    service.baseUrl,
    service.target,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.startsWith('http')) {
      return candidate;
    }
  }

  return null;
}

function getProtocolHint(key, service) {
  const hints = [
    normalizeProtocol(key),
    normalizeProtocol(service?.protocol),
    normalizeProtocol(service?.type),
    normalizeProtocol(service?.name),
    normalizeProtocol(service?.label),
  ].filter(Boolean);

  return hints.join(' ');
}

function normalizeA2AEndpoint(endpoint) {
  if (!endpoint) return null;
  if (
    endpoint.endsWith('/.well-known/agent-card.json') ||
    endpoint.endsWith('.well-known/agent-card.json')
  ) {
    return endpoint;
  }

  const trimmed = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
  return `${trimmed}/.well-known/agent-card.json`;
}

export function extractDeclaredEndpoints(agent) {
  const services = agent?.services;
  if (!services) return {};

  const entries = Array.isArray(services)
    ? services.map((service, index) => [String(index), service])
    : Object.entries(services);

  const endpoints = {};

  for (const [key, service] of entries) {
    const endpoint = getEndpointValue(service);
    if (!endpoint) continue;

    const hint = getProtocolHint(key, service);
    if (!endpoints.web && hint.includes('WEB')) {
      endpoints.web = endpoint;
    }
    if (!endpoints.a2a && hint.includes('A2A')) {
      endpoints.a2a = normalizeA2AEndpoint(endpoint);
    }
    if (!endpoints.mcp && hint.includes('MCP')) {
      endpoints.mcp = endpoint;
    }
  }

  return endpoints;
}

function getPrimaryEndpoint(endpoints, tokenId) {
  return (
    endpoints.web ||
    endpoints.a2a ||
    endpoints.mcp ||
    `https://www.8004scan.io/agents/${chainKey}/${tokenId}`
  );
}

function declaredTargetCount(endpoints) {
  return ['web', 'a2a', 'mcp'].filter((key) => !!endpoints[key]).length;
}

function safeCount(value) {
  if (Array.isArray(value)) return value.length;
  return null;
}

async function timedFetch(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ENDPOINT_TIMEOUT_MS);
  const start = Date.now();

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return {
      ok: true,
      response,
      latencyMs: Date.now() - start,
      timedOut: false,
    };
  } catch (error) {
    return {
      ok: false,
      response: null,
      latencyMs: Date.now() - start,
      timedOut: error?.name === 'AbortError',
      error: error?.message || 'request failed',
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function checkWebEndpoint(url) {
  const result = await timedFetch(url);
  if (!result.ok) {
    return {
      protocol: 'web',
      endpoint: url,
      success: false,
      status: 0,
      latencyMs: null,
      detail: result.timedOut ? 'timeout after 10s' : result.error,
    };
  }

  return {
    protocol: 'web',
    endpoint: url,
    success: result.response.ok,
    status: result.response.status,
    latencyMs: result.latencyMs,
    detail: result.response.ok
      ? 'returns 200-range response'
      : `returns ${result.response.status}`,
  };
}

export async function checkA2AEndpoint(url) {
  const result = await timedFetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!result.ok) {
    return {
      protocol: 'a2a',
      endpoint: url,
      success: false,
      status: 0,
      latencyMs: null,
      detail: result.timedOut ? 'timeout after 10s' : result.error,
      skillsCount: null,
    };
  }

  let body = null;
  try {
    body = await result.response.json();
  } catch {
    body = null;
  }

  const skillsCount =
    safeCount(body?.skills) ??
    safeCount(body?.capabilities) ??
    safeCount(body?.tools);
  const success =
    !!body && typeof body.name === 'string' && body.name.trim().length > 0;

  return {
    protocol: 'a2a',
    endpoint: url,
    success,
    status: result.response.status,
    latencyMs: result.latencyMs,
    detail: success ? 'agent card valid' : 'agent card invalid or missing name',
    skillsCount,
  };
}

export async function checkMcpEndpoint(url) {
  const result = await timedFetch(url);
  if (!result.ok) {
    return {
      protocol: 'mcp',
      endpoint: url,
      success: false,
      status: 0,
      latencyMs: null,
      detail: result.timedOut ? 'timeout after 10s' : result.error,
    };
  }

  const ok = result.response.ok;
  return {
    protocol: 'mcp',
    endpoint: url,
    success: ok,
    status: result.response.status,
    latencyMs: result.latencyMs,
    detail: ok ? 'endpoint reachable' : `returns ${result.response.status}`,
  };
}

export async function runHealthChecks(endpoints) {
  const results = {};

  if (endpoints.web) {
    results.web = await checkWebEndpoint(endpoints.web);
  }
  if (endpoints.a2a) {
    results.a2a = await checkA2AEndpoint(endpoints.a2a);
  }
  if (endpoints.mcp) {
    results.mcp = await checkMcpEndpoint(endpoints.mcp);
  }

  return results;
}

// --- Review Generation ---
export function scoreHealthResults(results) {
  const declared = Object.keys(results).length;
  const successes = Object.values(results).filter(
    (result) => result.success
  ).length;

  // 8004scan uses 0-100 scale for decimals=0 feedback values
  if (successes === declared && declared >= 2) {
    return { value: 90, tag2: 'service_quality', status: 'healthy' };
  }
  if (successes >= 2) {
    return { value: 75, tag2: 'service_quality', status: 'degraded' };
  }
  if (successes === 1) {
    return { value: 55, tag2: 'service_quality', status: 'degraded' };
  }
  return { value: 20, tag2: 'liveness', status: 'unreachable' };
}

function formatLatency(latencyMs) {
  return Number.isFinite(latencyMs) ? `${latencyMs}ms` : 'n/a';
}

function describeResult(result) {
  if (result.protocol === 'web') {
    if (result.success)
      return `web returns ${result.status} in ${formatLatency(result.latencyMs)}`;
    return result.status
      ? `web returns ${result.status}`
      : `web ${result.detail}`;
  }

  if (result.protocol === 'a2a') {
    if (result.success) {
      const suffix = Number.isFinite(result.skillsCount)
        ? ` with ${result.skillsCount} skills`
        : '';
      return `A2A card valid in ${formatLatency(result.latencyMs)}${suffix}`;
    }
    return result.status
      ? `A2A card invalid (${result.status})`
      : `A2A ${result.detail}`;
  }

  if (result.success)
    return `MCP responds in ${formatLatency(result.latencyMs)}`;
  return result.status
    ? `MCP returns ${result.status}`
    : `MCP ${result.detail}`;
}

export function buildReviewText(results, now = new Date()) {
  const ordered = ['mcp', 'a2a', 'web']
    .map((key) => results[key])
    .filter(Boolean)
    .map(describeResult);

  const { status } = scoreHealthResults(results);
  let summary = 'partial service availability.';

  if (status === 'healthy') summary = 'all declared services operational.';
  if (status === 'unreachable')
    summary = `all declared endpoints unreachable. last check: ${now.toISOString().slice(0, 10)}.`;

  return `${ordered.join(', ')}. ${summary}`.trim();
}

function shouldCheckAgent(agent, state, seenThisRun) {
  const tokenId = String(agent.token_id);
  const stateKey = `${chain.chainId}:${tokenId}`;
  const protocols = (agent.supported_protocols || []).map(normalizeProtocol);
  const hasRelevantProtocol = protocols.some((protocol) =>
    PROTOCOLS_TO_CHECK.has(protocol)
  );
  const lastCheck = state.checked[stateKey]?.lastCheck;
  const checkedRecently = lastCheck
    ? Date.now() - new Date(lastCheck).getTime() < RECHECK_WINDOW_MS
    : false;

  if (parseInt(tokenId, 10) === chain.ackAgentId) return false;
  if (seenThisRun.has(stateKey)) return false;
  if (!hasRelevantProtocol) return false;
  if (checkedRecently) return false;

  return true;
}

// --- Onchain Submission ---
function submitFeedback(agentId, value, tag2, endpoint, review) {
  const feedbackURI = `data:,${review}`;
  const feedbackHash = '0x' + createHash('sha256').update(review).digest('hex');

  const cmd = [
    'cast send',
    REPUTATION_REGISTRY,
    "'giveFeedback(uint256,int128,uint8,string,string,string,string,bytes32)'",
    agentId,
    value,
    VALUE_DECIMALS,
    `"${TAG1}"`,
    `"${tag2}"`,
    `"${endpoint}"`,
    `"${feedbackURI}"`,
    feedbackHash,
    `--private-key "${process.env.ACK_PRIVATE_KEY || '$(security find-generic-password -s openclaw-assembly-ack-private-key -w)'}"`,
    `--rpc-url ${chain.rpc}`,
  ].join(' ');

  if (dryRun) {
    console.log(
      `  [DRY RUN] Would send: giveFeedback(${agentId}, ${value}, "${tag2}", "${review.slice(0, 80)}...")`
    );
    return { txHash: 'DRY_RUN', success: true };
  }

  try {
    const output = execSync(cmd, {
      encoding: 'utf-8',
      timeout: 120000,
      shell: '/bin/zsh',
    });
    const hashMatch = output.match(/transactionHash\s+(0x[a-fA-F0-9]+)/);
    const statusMatch = output.match(/status\s+(\d+)/);
    const txHash = hashMatch ? hashMatch[1] : 'unknown';
    const success = statusMatch ? statusMatch[1] === '1' : false;
    return { txHash, success };
  } catch (e) {
    console.error(`  [ERROR] Transaction failed: ${e.message.slice(0, 200)}`);
    return { txHash: null, success: false };
  }
}

// --- Main ---
export async function main() {
  console.log(`\n=== ACK Health Checker ===`);
  console.log(`Chain: ${chain.name} (${chain.chainId})`);
  console.log(`ACK Agent: #${chain.ackAgentId}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Limit: ${limit} agents`);
  console.log(`Timeout: ${ENDPOINT_TIMEOUT_MS / 1000}s per endpoint\n`);

  if (requestedLimit > MAX_AGENTS_PER_RUN) {
    console.log(
      `Requested limit ${requestedLimit} capped to ${MAX_AGENTS_PER_RUN}.`
    );
  }

  const state = loadState();
  const apiKey = getScanApiKey();
  const seenThisRun = new Set();

  if (!apiKey) {
    console.log(
      '8004scan API key not found in keychain, attempting unauthenticated requests.'
    );
  }

  let targets;
  try {
    if (specificIds) {
      console.log(`Fetching specific agents: ${specificIds.join(', ')}`);
      const fetched = await fetchAgents(specificIds, apiKey);
      targets = fetched
        .filter((agent) => shouldCheckAgent(agent, state, seenThisRun))
        .slice(0, limit);
    } else {
      console.log(`Fetching ${chain.name} agents from 8004scan...`);
      const all = await fetchChainAgents(100, apiKey);
      targets = all
        .filter((agent) => shouldCheckAgent(agent, state, seenThisRun))
        .slice(0, limit);
    }
  } catch (error) {
    console.log(`Discovery failed: ${error.message}`);
    state.lastRun = new Date().toISOString();
    saveState(state);
    return;
  }

  if (targets.length === 0) {
    console.log('No eligible agents to health check. Done.');
    state.lastRun = new Date().toISOString();
    saveState(state);
    return;
  }

  console.log(`Found ${targets.length} agents to check:\n`);

  for (const agent of targets) {
    const tokenId = String(agent.token_id);
    const stateKey = `${chain.chainId}:${tokenId}`;
    const name = agent.name || `Agent #${tokenId}`;
    seenThisRun.add(stateKey);

    console.log(`--- Checking: ${name} (#${tokenId}) ---`);
    console.log(
      `  Protocols: ${(agent.supported_protocols || []).join(', ') || 'none'}`
    );

    const detail = agent.services
      ? agent
      : await fetchAgentDetail(tokenId, apiKey);
    const endpoints = extractDeclaredEndpoints(detail || agent);

    if (declaredTargetCount(endpoints) === 0) {
      console.log('  [SKIP] No declared Web, A2A, or MCP endpoints found.\n');
      continue;
    }

    for (const [protocol, endpoint] of Object.entries(endpoints)) {
      console.log(`  ${protocol.toUpperCase()}: ${endpoint}`);
    }

    const results = await runHealthChecks(endpoints);
    for (const result of Object.values(results)) {
      const outcome = result.success ? 'PASS' : 'FAIL';
      const suffix = result.status ? `status ${result.status}` : result.detail;
      console.log(
        `    -> ${result.protocol.toUpperCase()}: ${outcome}, ${suffix}`
      );
    }

    const { value, tag2, status } = scoreHealthResults(results);
    const review = buildReviewText(results);
    const endpoint = getPrimaryEndpoint(endpoints, tokenId);

    console.log(`  Rating: ${value}/100 (${tag2})`);
    console.log(`  Review: ${review}`);

    const { txHash, success } = submitFeedback(
      tokenId,
      value,
      tag2,
      endpoint,
      review
    );

    if (success) {
      console.log(`  TX: ${txHash}`);
      if (!dryRun) {
        console.log(`  Explorer: ${chain.explorer}/${txHash}`);
      }

      const latencies = Object.values(results)
        .map((result) => result.latencyMs)
        .filter(Number.isFinite);

      state.checked[stateKey] = {
        chain: chainKey,
        name,
        lastCheck: new Date().toISOString(),
        status,
        responseMs: latencies.length > 0 ? Math.min(...latencies) : null,
        value,
        tag2,
        review,
        txHash,
      };
      state.totalChecks = (state.totalChecks || 0) + 1;
    } else {
      console.log('  FAILED');
    }

    console.log('');

    if (!dryRun && targets.indexOf(agent) < targets.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  state.lastRun = new Date().toISOString();
  saveState(state);

  const chainStats = Object.entries(state.checked).filter(
    ([, value]) => value.chain === chainKey
  ).length;
  console.log(
    `=== Done. Checked ${targets.length} agents on ${chain.name}. Chain total: ${chainStats}. Lifetime: ${state.totalChecks} ===\n`
  );
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
