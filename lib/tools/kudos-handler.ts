/**
 * Action dispatcher for the ACK kudos ERC-8257 tool.
 * Kept separate from app/api/tool/route.ts so reputation (#36) can own that path.
 */

import {
  KUDOS_TOOL_ACTIONS,
  type KudosToolAction,
} from '@/lib/tools/kudos-manifest';
import {
  queryKudosDetail,
  queryKudosFeed,
  queryStreaks,
  queryTipFeed,
  queryTipStats,
  queryVouch,
} from '@/lib/tools/kudos-queries';
import { resolveChainId } from '@/config/chain';

export interface KudosToolInput {
  action: KudosToolAction;
  txHash?: string;
  tipId?: string;
  agentId?: number;
  sender?: string;
  handle?: string;
  category?: string;
  wallet?: string;
  address?: string;
  chainId?: number;
  limit?: number;
}

export interface KudosToolResult {
  status: number;
  body: Record<string, unknown>;
}

function assertNever(value: never): never {
  throw new Error(`Unexpected action: ${String(value)}`);
}

export function validateKudosToolInput(
  body: unknown
): { ok: true; input: KudosToolInput } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body must be a JSON object' };
  }

  const raw = body as Record<string, unknown>;

  if (!raw.action || typeof raw.action !== 'string') {
    return { ok: false, error: 'action is required and must be a string' };
  }

  if (!(KUDOS_TOOL_ACTIONS as readonly string[]).includes(raw.action)) {
    return {
      ok: false,
      error: `Invalid action: ${raw.action}. Valid actions: ${KUDOS_TOOL_ACTIONS.join(', ')}`,
    };
  }

  const limit = raw.limit != null ? Number(raw.limit) : undefined;
  if (limit != null && (!Number.isFinite(limit) || limit < 1 || limit > 50)) {
    return { ok: false, error: 'limit must be between 1 and 50' };
  }

  const agentId = raw.agentId != null ? Number(raw.agentId) : undefined;
  if (agentId !== undefined && (!Number.isInteger(agentId) || agentId < 0)) {
    return { ok: false, error: 'agentId must be a non-negative integer' };
  }

  const chainId =
    raw.chainId != null
      ? resolveChainId(raw.chainId as string | number)
      : undefined;

  return {
    ok: true,
    input: {
      action: raw.action as KudosToolAction,
      txHash: typeof raw.txHash === 'string' ? raw.txHash : undefined,
      tipId: typeof raw.tipId === 'string' ? raw.tipId : undefined,
      agentId,
      sender: typeof raw.sender === 'string' ? raw.sender : undefined,
      handle: typeof raw.handle === 'string' ? raw.handle : undefined,
      category: typeof raw.category === 'string' ? raw.category : undefined,
      wallet: typeof raw.wallet === 'string' ? raw.wallet : undefined,
      address: typeof raw.address === 'string' ? raw.address : undefined,
      chainId,
      limit,
    },
  };
}

export async function handleKudosToolAction(
  input: KudosToolInput
): Promise<KudosToolResult> {
  switch (input.action) {
    case 'kudos_feed': {
      const result = await queryKudosFeed({
        agentId: input.agentId,
        sender: input.sender,
        handle: input.handle,
        category: input.category,
        chainId: input.chainId,
        limit: input.limit,
      });
      return { status: 200, body: result };
    }

    case 'kudos_detail': {
      if (!input.txHash) {
        return {
          status: 400,
          body: { error: 'txHash is required for kudos_detail' },
        };
      }
      const result = await queryKudosDetail(input.txHash, input.chainId);
      if (!result.ok) {
        return { status: result.status, body: { error: result.error } };
      }
      return { status: 200, body: { kudos: result.kudos } };
    }

    case 'tip_feed': {
      const result = await queryTipFeed({
        agentId: input.agentId,
        tipId: input.tipId,
        chainId: input.chainId,
        limit: input.limit,
      });
      if (!result.ok) {
        return { status: result.status, body: { error: result.error } };
      }
      return { status: 200, body: { items: result.items } };
    }

    case 'tip_stats': {
      const result = await queryTipStats({
        agentId: input.agentId,
        wallet: input.wallet,
      });
      if (!result.ok) {
        return { status: result.status, body: { error: result.error } };
      }
      return { status: 200, body: result.stats };
    }

    case 'streaks': {
      if (!input.address) {
        return {
          status: 400,
          body: { error: 'address is required for streaks' },
        };
      }
      const result = await queryStreaks(input.address);
      if (!result.ok) {
        return { status: result.status, body: { error: result.error } };
      }
      return {
        status: 200,
        body: { address: result.address, streak: result.streak },
      };
    }

    case 'vouch': {
      if (!input.address) {
        return {
          status: 400,
          body: { error: 'address is required for vouch' },
        };
      }
      const result = queryVouch(input.address);
      if (!result.ok) {
        return { status: result.status, body: { error: result.error } };
      }
      return {
        status: 200,
        body: {
          address: result.address,
          vouches: result.vouches,
          count: result.count,
        },
      };
    }

    default:
      return assertNever(input.action);
  }
}

export async function handleKudosTool(body: unknown): Promise<KudosToolResult> {
  const validation = validateKudosToolInput(body);
  if (!validation.ok) {
    return { status: 400, body: { error: validation.error } };
  }

  try {
    return await handleKudosToolAction(validation.input);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return { status: 500, body: { error: message } };
  }
}
