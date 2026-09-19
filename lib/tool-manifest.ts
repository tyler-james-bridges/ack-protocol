/**
 * ERC-8257 tool manifests served at `/.well-known/ai-tool/<name>.json`.
 *
 * Reputation is registered first. Later tools (kudos, etc.) add an entry to
 * `TOOL_MANIFESTS` and a matching well-known route — no rewrite required.
 */

import {
  ACK_TREASURY_ADDRESS,
  BASE_USDC_ADDRESS,
  USDC_ADDRESS,
} from '@/config/tokens';

export const ERC_8257_MANIFEST_TYPE =
  'https://ercs.ethereum.org/ERCS/erc-8257#tool-manifest-v1' as const;

export type X402Network = 'base' | 'abstract';

export interface ToolPricingOption {
  amount: string;
  asset: string;
  recipient: string;
  protocol: 'x402';
}

export interface ToolJsonSchema {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
}

export interface ToolManifest {
  type: typeof ERC_8257_MANIFEST_TYPE;
  name: string;
  description: string;
  endpoint: string;
  inputs: ToolJsonSchema;
  outputs: ToolJsonSchema;
  creatorAddress: `0x${string}`;
  pricing: ToolPricingOption[];
  tags: string[];
  version: string;
}

export const REPUTATION_TOOL_NAME = 'ack-reputation' as const;

export const REPUTATION_ACTIONS = [
  'reputation',
  'feedback_history',
  'discover',
  'agent_info',
] as const;

export type ReputationAction = (typeof REPUTATION_ACTIONS)[number];

export const DEFAULT_TOOL_PRICE_USDC = '0.01';
export const DISCOVER_TOOL_PRICE_USDC = '0.02';

const NETWORK_ASSET: Record<X402Network, { chainId: number; asset: string }> = {
  base: {
    chainId: 8453,
    asset: `eip155:8453/erc20:${BASE_USDC_ADDRESS.toLowerCase()}`,
  },
  abstract: {
    chainId: 2741,
    asset: `eip155:2741/erc20:${USDC_ADDRESS.toLowerCase()}`,
  },
};

/** Convert a decimal USDC string ("0.01") to 6-decimal base units ("10000"). */
export function usdcToBaseUnits(amountUsdc: string): string {
  const parsed = Number(amountUsdc);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid USDC amount: ${amountUsdc}`);
  }
  return Math.round(parsed * 1e6).toString();
}

/**
 * ERC-8257 x402 pricing helper.
 *
 * OpenSea/ERC-8257 inspect currently canonicalizes Base USDC. ACK paid APIs
 * are $0.01–$0.02 on Abstract, so we emit both rails at the same dollar price.
 */
export function x402UsdcPricing(options: {
  amountUsdc: string;
  recipient: `0x${string}`;
  networks?: X402Network[];
}): ToolPricingOption[] {
  const networks = options.networks ?? ['base', 'abstract'];
  const amount = usdcToBaseUnits(options.amountUsdc);
  const recipient = options.recipient.toLowerCase() as `0x${string}`;

  return networks.map((network) => {
    const cfg = NETWORK_ASSET[network];
    return {
      amount,
      asset: cfg.asset,
      recipient: `eip155:${cfg.chainId}:${recipient}`,
      protocol: 'x402' as const,
    };
  });
}

export function getToolBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://ack-onchain.dev'
  ).replace(/\/$/, '');
}

export function getToolCreatorAddress(): `0x${string}` {
  const fromEnv = process.env.TOOL_CREATOR_ADDRESS;
  const address = (fromEnv || ACK_TREASURY_ADDRESS).toLowerCase();
  return address as `0x${string}`;
}

export function getToolPayoutAddress(): `0x${string}` {
  const fromEnv =
    process.env.AGENT_WALLET_ADDRESS || process.env.TOOL_PAYOUT_ADDRESS;
  const address = (fromEnv || ACK_TREASURY_ADDRESS).toLowerCase();
  return address as `0x${string}`;
}

export function buildAckReputationManifest(): ToolManifest {
  const baseUrl = getToolBaseUrl();
  const creatorAddress = getToolCreatorAddress();
  const payoutAddress = getToolPayoutAddress();

  return {
    type: ERC_8257_MANIFEST_TYPE,
    name: REPUTATION_TOOL_NAME,
    description:
      'Query ACK onchain agent reputation, paginated feedback history, discovery filters, and single-agent profiles via standardized ERC-8257 tool calls with x402 USDC micropayments.',
    endpoint: `${baseUrl}/api/tool`,
    inputs: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: [...REPUTATION_ACTIONS],
          description:
            'reputation: full wallet reputation profile. feedback_history: paginated feedback for an agent. discover: search/filter agents. agent_info: single agent details.',
        },
        address: {
          type: 'string',
          description: 'Ethereum address (required for reputation)',
        },
        agentId: {
          type: 'integer',
          minimum: 0,
          description:
            'Agent token ID (required for feedback_history and agent_info)',
        },
        chainId: {
          type: 'integer',
          description: 'Chain ID (default 2741 Abstract)',
        },
        scanId: {
          type: 'string',
          description: 'chainId:agentId form, e.g. 2741:606 (agent_info)',
        },
        query: {
          type: 'string',
          description: 'Search text for discover',
        },
        category: {
          type: 'string',
          enum: [
            'reliability',
            'speed',
            'accuracy',
            'creativity',
            'collaboration',
            'security',
          ],
          description: 'Kudos category filter for discover',
        },
        minScore: {
          type: 'number',
          minimum: 0,
          description: 'Minimum total_score for discover',
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          description: 'Page size (discover max 50, feedback_history max 100)',
        },
        offset: {
          type: 'integer',
          minimum: 0,
          description: 'Pagination offset',
        },
      },
      required: ['action'],
    },
    outputs: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Wallet address (reputation)' },
        agents: {
          type: 'array',
          description: 'Agent list (reputation or discover)',
        },
        aggregatedScore: {
          type: 'number',
          description: 'Average agent quality score',
        },
        trustScore: { type: 'number', description: 'Alias of aggregatedScore' },
        totalKudos: {
          type: 'integer',
          description: 'Kudos count across owned agents',
        },
        topCategory: {
          type: ['string', 'null'],
          description: 'Most common kudos category',
        },
        categories: { type: 'object', description: 'Kudos counts by category' },
        events: { type: 'array', description: 'Paginated feedback events' },
        agent: {
          type: 'object',
          description: 'Single agent profile (agent_info)',
        },
        total: { type: 'integer', description: 'Total matching rows' },
        limit: { type: 'integer' },
        offset: { type: 'integer' },
        error: {
          type: 'string',
          description: 'Error message if the action failed',
        },
      },
    },
    creatorAddress,
    pricing: x402UsdcPricing({
      amountUsdc: DEFAULT_TOOL_PRICE_USDC,
      recipient: payoutAddress,
      networks: ['base', 'abstract'],
    }),
    tags: [
      'reputation',
      'erc-8004',
      'erc-8257',
      'ack',
      'x402',
      'agents',
      'trust',
    ],
    version: '1.0.0',
  };
}

export const ackReputationManifest: ToolManifest = buildAckReputationManifest();

/**
 * Registry of served manifests. A later tool adds one key + well-known route.
 */
export const TOOL_MANIFESTS: Record<string, ToolManifest> = {
  [REPUTATION_TOOL_NAME]: ackReputationManifest,
};

export function getToolManifest(name: string): ToolManifest | undefined {
  return TOOL_MANIFESTS[name];
}

export function listToolManifests(): ToolManifest[] {
  return Object.values(TOOL_MANIFESTS);
}
