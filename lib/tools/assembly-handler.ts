/**
 * Action dispatcher for the ACK Assembly ERC-8257 tool.
 *
 * Served at POST /api/tool/assembly so it does not share the reputation
 * unified /api/tool path.
 */

import { ETH_ADDRESS_RE } from '@/lib/tool-queries';
import {
  ASSEMBLY_ACTIONS,
  type AssemblyAction,
} from '@/lib/tools/assembly-manifest';
import {
  MAX_ASSEMBLY_LIMIT,
  queryGovernanceStats,
  queryMemberDetail,
  queryMembers,
  queryProposals,
} from '@/lib/tools/assembly-queries';

export interface AssemblyToolResult {
  status: number;
  body: Record<string, unknown>;
}

export interface AssemblyToolInput {
  action: AssemblyAction;
  address?: string;
  status?: string;
  proposalId?: number;
  limit?: number;
  offset?: number;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled assembly action: ${String(value)}`);
}

function asInt(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    return parseInt(value, 10);
  }
  return undefined;
}

export function validateAssemblyToolInput(
  body: unknown
): { ok: true; input: AssemblyToolInput } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body must be a JSON object' };
  }

  const raw = body as Record<string, unknown>;
  if (!raw.action || typeof raw.action !== 'string') {
    return { ok: false, error: 'action is required and must be a string' };
  }

  if (!(ASSEMBLY_ACTIONS as readonly string[]).includes(raw.action)) {
    return {
      ok: false,
      error: `Invalid action: ${raw.action}. Valid actions: ${ASSEMBLY_ACTIONS.join(', ')}`,
    };
  }

  const limit = raw.limit != null ? asInt(raw.limit) : undefined;
  if (
    raw.limit != null &&
    (limit == null || limit < 1 || limit > MAX_ASSEMBLY_LIMIT)
  ) {
    return {
      ok: false,
      error: `limit must be between 1 and ${MAX_ASSEMBLY_LIMIT}`,
    };
  }

  const offset = raw.offset != null ? asInt(raw.offset) : undefined;
  if (raw.offset != null && (offset == null || offset < 0)) {
    return { ok: false, error: 'offset must be >= 0' };
  }

  const proposalId = raw.proposalId != null ? asInt(raw.proposalId) : undefined;
  if (raw.proposalId != null && (proposalId == null || proposalId < 1)) {
    return { ok: false, error: 'proposalId must be a positive integer' };
  }

  const address =
    typeof raw.address === 'string' ? raw.address.trim() : undefined;
  const status = typeof raw.status === 'string' ? raw.status.trim() : undefined;

  return {
    ok: true,
    input: {
      action: raw.action as AssemblyAction,
      address,
      status: status || undefined,
      proposalId,
      limit,
      offset,
    },
  };
}

export async function handleAssemblyToolAction(
  input: AssemblyToolInput
): Promise<AssemblyToolResult> {
  switch (input.action) {
    case 'members': {
      const result = await queryMembers({
        status: input.status,
        limit: input.limit,
        offset: input.offset,
      });
      return { status: 200, body: { ...result } };
    }

    case 'member_detail': {
      if (!input.address || !ETH_ADDRESS_RE.test(input.address)) {
        return {
          status: 400,
          body: {
            error:
              'address is required for member_detail and must be a valid Ethereum address',
          },
        };
      }
      const member = await queryMemberDetail(input.address);
      return { status: 200, body: { member } };
    }

    case 'proposals': {
      const result = await queryProposals({
        status: input.status,
        proposalId: input.proposalId,
        limit: input.limit,
      });
      return { status: 200, body: { ...result } };
    }

    case 'governance_stats': {
      const stats = await queryGovernanceStats();
      return { status: 200, body: stats };
    }

    default:
      return assertNever(input.action);
  }
}

export async function handleAssemblyTool(
  body: unknown
): Promise<AssemblyToolResult> {
  const validation = validateAssemblyToolInput(body);
  if (!validation.ok) {
    return { status: 400, body: { error: validation.error } };
  }

  try {
    return await handleAssemblyToolAction(validation.input);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return { status: 500, body: { error: message } };
  }
}
