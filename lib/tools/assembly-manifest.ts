/**
 * ERC-8257 manifest for the ACK Assembly intelligence tool.
 *
 * Separate from ack-reputation so the registry lists another distinct tool.
 * Pricing helpers come from lib/tool-manifest.ts (reputation #36).
 */

import {
  DISCOVER_TOOL_PRICE_USDC,
  ERC_8257_MANIFEST_TYPE,
  getToolBaseUrl,
  getToolCreatorAddress,
  getToolPayoutAddress,
  type ToolManifest,
  usdcToBaseUnits,
  x402UsdcPricing,
} from '@/lib/tool-manifest';

export const ASSEMBLY_TOOL_NAME = 'ack-assembly' as const;

export const ASSEMBLY_ACTIONS = [
  'members',
  'member_detail',
  'proposals',
  'governance_stats',
] as const;

export type AssemblyAction = (typeof ASSEMBLY_ACTIONS)[number];

/** $0.02 USDC per call — same band as ACK discovery / ACP. */
export const ASSEMBLY_TOOL_PRICE_USDC = DISCOVER_TOOL_PRICE_USDC;

export function buildAckAssemblyManifest(): ToolManifest {
  const baseUrl = getToolBaseUrl();
  const creatorAddress = getToolCreatorAddress();
  const payoutAddress = getToolPayoutAddress();

  return {
    type: ERC_8257_MANIFEST_TYPE,
    name: ASSEMBLY_TOOL_NAME,
    description:
      'Query AI Assembly onchain governance on Abstract: member heartbeat status, council seats and voting power, Governance proposals, and assembly-wide statistics via ERC-8257 tool calls with x402 USDC micropayments.',
    endpoint: `${baseUrl}/api/tool/assembly`,
    inputs: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: [...ASSEMBLY_ACTIONS],
          description:
            'members: list registry members with status. member_detail: one member (seats, voting power, heartbeat). proposals: active/recent Governance proposals. governance_stats: assembly-wide counts and auction snapshot.',
        },
        address: {
          type: 'string',
          description: 'Member wallet (required for member_detail)',
        },
        status: {
          type: 'string',
          description:
            'members: filter by heartbeat status (active, expired, inactive, unregistered). proposals: pending, active, passed, executed, defeated, cancelled, recent, or all. Default for proposals is in-flight then recent.',
        },
        proposalId: {
          type: 'integer',
          minimum: 1,
          description: 'Single Governance proposal id (1-indexed)',
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 50,
          description: 'Page size for members and proposals (default 20)',
        },
        offset: {
          type: 'integer',
          minimum: 0,
          description: 'Pagination offset for members',
        },
      },
      required: ['action'],
    },
    outputs: {
      type: 'object',
      properties: {
        members: { type: 'array', description: 'Member roster rows' },
        member: {
          type: 'object',
          description: 'Single member profile (member_detail)',
        },
        proposals: { type: 'array', description: 'Governance proposals' },
        count: { type: 'integer' },
        total: { type: 'integer' },
        available: {
          type: 'boolean',
          description: 'False when a data source could not be read',
        },
        source: { type: 'string' },
        warning: { type: 'string' },
        note: { type: 'string' },
        membersStats: { type: 'object' },
        council: { type: 'object' },
        governance: { type: 'object' },
        forum: { type: 'object' },
        error: {
          type: 'string',
          description: 'Error message if the action failed',
        },
      },
    },
    creatorAddress,
    pricing: x402UsdcPricing({
      amountUsdc: ASSEMBLY_TOOL_PRICE_USDC,
      recipient: payoutAddress,
      networks: ['base', 'abstract'],
    }),
    tags: [
      'assembly',
      'governance',
      'dao',
      'erc-8257',
      'ack',
      'x402',
      'abstract',
    ],
    version: '1.0.0',
  };
}

export const ackAssemblyManifest: ToolManifest = buildAckAssemblyManifest();

export const ASSEMBLY_PRICE_ATOMIC = usdcToBaseUnits(ASSEMBLY_TOOL_PRICE_USDC);
export const ACK_ASSEMBLY_METADATA_URI =
  'https://ack-onchain.dev/.well-known/ai-tool/ack-assembly.json';
