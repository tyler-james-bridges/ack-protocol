/**
 * ACK reputation tool actions.
 *
 * Import this module from the unified `/api/tool` handler so the actions
 * self-register. A later tool follows the same pattern.
 */

import { DEFAULT_8004_CHAIN_ID } from '@/config/chain';
import { KUDOS_CATEGORIES } from '@/config/contract';
import {
  type ReputationAction,
  REPUTATION_ACTIONS,
  REPUTATION_TOOL_NAME,
} from '@/lib/tool-manifest';
import {
  discoverAgents,
  ETH_ADDRESS_RE,
  getAgentInfo,
  getFeedbackHistory,
  getReputationByAddress,
  isKudosCategory,
  MAX_DISCOVER_LIMIT,
  MAX_FEEDBACK_LIMIT,
} from '@/lib/tool-queries';
import {
  registerToolAction,
  type JsonObject,
  type ToolActionResult,
} from '@/lib/tool-registry';

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asInt(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    return parseInt(value, 10);
  }
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function parseScanId(
  scanId: string
): { chainId: number; agentId: number } | null {
  const [chainPart, tokenPart] = scanId.split(':');
  const chainId = asInt(chainPart);
  const agentId = asInt(tokenPart);
  if (chainId == null || agentId == null || agentId < 0) return null;
  return { chainId, agentId };
}

function badRequest(error: string): ToolActionResult {
  return { status: 400, body: { error } };
}

function notFound(error: string): ToolActionResult {
  return { status: 404, body: { error } };
}

async function handleReputation(params: JsonObject): Promise<ToolActionResult> {
  const address = asString(params.address);
  if (!address || !ETH_ADDRESS_RE.test(address)) {
    return badRequest(
      'address is required and must be a valid Ethereum address'
    );
  }

  const profile = await getReputationByAddress(address);
  return { status: 200, body: { ...profile } };
}

async function handleFeedbackHistory(
  params: JsonObject
): Promise<ToolActionResult> {
  const agentId = asInt(params.agentId);
  if (agentId == null || agentId < 0) {
    return badRequest('agentId is required and must be a non-negative integer');
  }

  const limit = asInt(params.limit);
  const offset = asInt(params.offset);
  if (limit != null && (limit < 1 || limit > MAX_FEEDBACK_LIMIT)) {
    return badRequest(`limit must be between 1 and ${MAX_FEEDBACK_LIMIT}`);
  }
  if (offset != null && offset < 0) {
    return badRequest('offset must be >= 0');
  }

  const result = await getFeedbackHistory({ agentId, limit, offset });
  return { status: 200, body: { ...result } };
}

async function handleDiscover(params: JsonObject): Promise<ToolActionResult> {
  const category = asString(params.category);
  if (category && !isKudosCategory(category)) {
    return badRequest(
      `Invalid category. Must be one of: ${KUDOS_CATEGORIES.join(', ')}`
    );
  }

  const chainId = asInt(params.chainId);
  if (params.chainId != null && (chainId == null || chainId <= 0)) {
    return badRequest('chainId must be a positive integer');
  }

  const limit = asInt(params.limit);
  const offset = asInt(params.offset);
  if (limit != null && (limit < 1 || limit > MAX_DISCOVER_LIMIT)) {
    return badRequest(`limit must be between 1 and ${MAX_DISCOVER_LIMIT}`);
  }
  if (offset != null && offset < 0) {
    return badRequest('offset must be >= 0');
  }

  const minScore = asNumber(params.minScore);
  if (params.minScore != null && (minScore == null || minScore < 0)) {
    return badRequest('minScore must be a number >= 0');
  }

  const result = await discoverAgents({
    category,
    chainId,
    limit,
    offset,
    minScore,
    query: asString(params.query),
  });
  return { status: 200, body: { ...result } };
}

async function handleAgentInfo(params: JsonObject): Promise<ToolActionResult> {
  const scanId = asString(params.scanId);
  let chainId = asInt(params.chainId);
  let agentId = asInt(params.agentId);

  if (scanId) {
    const parsed = parseScanId(scanId);
    if (!parsed) {
      return badRequest(
        'scanId must be in chainId:agentId form, e.g. 2741:606'
      );
    }
    chainId = parsed.chainId;
    agentId = parsed.agentId;
  }

  if (agentId == null || agentId < 0) {
    return badRequest('agentId is required (or provide scanId like 2741:606)');
  }

  const resolvedChainId = chainId ?? DEFAULT_8004_CHAIN_ID;
  const agent = await getAgentInfo({ chainId: resolvedChainId, agentId });
  if (!agent) {
    return notFound(`Agent not found: ${resolvedChainId}:${agentId}`);
  }
  return { status: 200, body: { agent } };
}

function assertNever(value: never): never {
  throw new Error(`Unhandled reputation action: ${String(value)}`);
}

export async function handleReputationAction(
  action: ReputationAction,
  params: JsonObject
): Promise<ToolActionResult> {
  switch (action) {
    case 'reputation':
      return handleReputation(params);
    case 'feedback_history':
      return handleFeedbackHistory(params);
    case 'discover':
      return handleDiscover(params);
    case 'agent_info':
      return handleAgentInfo(params);
    default:
      return assertNever(action);
  }
}

const ACTION_DESCRIPTIONS: Record<ReputationAction, string> = {
  reputation: 'Full reputation profile for a wallet address',
  feedback_history: 'Paginated onchain feedback for an agent',
  discover: 'Search and filter ERC-8004 agents',
  agent_info: 'Single agent details by chain and token ID',
};

export function registerReputationToolActions(): void {
  for (const action of REPUTATION_ACTIONS) {
    registerToolAction({
      name: action,
      tool: REPUTATION_TOOL_NAME,
      description: ACTION_DESCRIPTIONS[action],
      handler: (params) => handleReputationAction(action, params),
    });
  }
}

registerReputationToolActions();
