/**
 * Shared request parsing and action dispatch for `/api/tool`.
 *
 * New tools register actions; this dispatcher stays the same.
 */

import {
  getToolAction,
  listToolActionNames,
  listToolActions,
  type JsonObject,
  type ToolActionResult,
} from '@/lib/tool-registry';

export interface ParsedToolRequest {
  action: string;
  params: JsonObject;
}

export type ParseToolRequestResult =
  { ok: true; request: ParsedToolRequest } | { ok: false; error: string };

export function parseToolRequest(body: unknown): ParseToolRequestResult {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body must be a JSON object' };
  }

  const raw = body as JsonObject;
  if (!raw.action || typeof raw.action !== 'string') {
    return { ok: false, error: 'action is required and must be a string' };
  }

  const known = listToolActionNames();
  if (!known.includes(raw.action)) {
    return {
      ok: false,
      error:
        known.length > 0
          ? `Invalid action: ${raw.action}. Valid actions: ${known.join(', ')}`
          : `Invalid action: ${raw.action}`,
    };
  }

  return {
    ok: true,
    request: {
      action: raw.action,
      params: raw,
    },
  };
}

export async function dispatchToolRequest(
  body: unknown
): Promise<ToolActionResult> {
  const parsed = parseToolRequest(body);
  if (!parsed.ok) {
    return { status: 400, body: { error: parsed.error } };
  }

  const def = getToolAction(parsed.request.action);
  if (!def) {
    return {
      status: 400,
      body: { error: `Invalid action: ${parsed.request.action}` },
    };
  }

  return def.handler(parsed.request.params);
}

export function toolDiscoveryPayload(baseUrl: string) {
  return {
    name: 'ACK Tools',
    description:
      'Unified ERC-8257 tool endpoint. POST an action to query ACK reputation data. Additional tools can register more actions here.',
    endpoint: `${baseUrl}/api/tool`,
    actions: listToolActions().map((action) => ({
      name: action.name,
      tool: action.tool,
      description: action.description,
    })),
    manifests: {
      'ack-reputation': `${baseUrl}/.well-known/ai-tool/ack-reputation.json`,
    },
  };
}
