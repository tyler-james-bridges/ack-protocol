/**
 * ERC-8257 manifest for the ACK kudos & tips tool.
 *
 * Kept namespaced under lib/tools/kudos* so the parallel reputation tool
 * (#36) can own lib/tool-manifest.ts without merge conflicts.
 */

import { ACK_TREASURY_ADDRESS, USDC_ADDRESS } from '@/config/tokens';
import { DEFAULT_8004_CHAIN_ID } from '@/config/chain';

export const ACK_KUDOS_TOOL_NAME = 'ack-kudos';

export const ACK_ORIGIN = 'https://ack-onchain.dev';

export const ACK_KUDOS_TOOL_ENDPOINT = `${ACK_ORIGIN}/api/tool/kudos`;

export const ACK_KUDOS_METADATA_URI = `${ACK_ORIGIN}/.well-known/ai-tool/ack-kudos.json`;

/** $0.01 USDC (6 decimals) per tool call. */
export const ACK_KUDOS_PRICE_USDC = '0.01';
export const ACK_KUDOS_PRICE_ATOMIC = '10000';

export const KUDOS_TOOL_ACTIONS = [
  'kudos_feed',
  'kudos_detail',
  'tip_feed',
  'tip_stats',
  'streaks',
  'vouch',
] as const;

export type KudosToolAction = (typeof KUDOS_TOOL_ACTIONS)[number];

function lowercaseAddress(address: string): string {
  return address.toLowerCase();
}

function payToAddress(): string {
  return lowercaseAddress(
    process.env.AGENT_WALLET_ADDRESS || ACK_TREASURY_ADDRESS
  );
}

/**
 * ERC-8257 x402 pricing entry. Amount is the asset's smallest unit.
 * Abstract USDC matches ACK's existing withPayment rail.
 */
export function kudosX402Pricing() {
  const recipient = payToAddress();
  const asset = lowercaseAddress(USDC_ADDRESS);
  const chainId = DEFAULT_8004_CHAIN_ID;
  return [
    {
      amount: ACK_KUDOS_PRICE_ATOMIC,
      asset: `eip155:${chainId}/erc20:${asset}`,
      recipient: `eip155:${chainId}:${recipient}`,
      protocol: 'x402',
    },
  ];
}

export const ackKudosManifest = {
  type: 'https://ercs.ethereum.org/ERCS/erc-8257#tool-manifest-v1',
  name: ACK_KUDOS_TOOL_NAME,
  description:
    'ACK kudos and tipping data for ERC-8004 agents. Look up recent kudos, tip activity, streaks, and vouch status via x402 micropayments.',
  endpoint: ACK_KUDOS_TOOL_ENDPOINT,
  inputs: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: [...KUDOS_TOOL_ACTIONS],
        description: 'Which kudos or tipping operation to perform',
      },
      txHash: {
        type: 'string',
        description: 'Kudos transaction hash (required for kudos_detail)',
      },
      tipId: {
        type: 'string',
        description: 'Tip id (optional for tip_feed single-tip lookup)',
      },
      agentId: {
        type: 'integer',
        description: 'ERC-8004 agent token id filter',
      },
      sender: {
        type: 'string',
        description: 'Kudos sender address filter',
      },
      handle: {
        type: 'string',
        description: 'X handle filter for proxy kudos',
      },
      category: {
        type: 'string',
        description: 'Kudos category filter (tag2)',
      },
      wallet: {
        type: 'string',
        description: 'Wallet that gave tips (tip_stats)',
      },
      address: {
        type: 'string',
        description: 'Address for streaks or vouch lookup',
      },
      chainId: {
        type: 'integer',
        description: 'ERC-8004 chain id (default Abstract 2741)',
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 50,
        description: 'Max results for feed actions',
      },
    },
    required: ['action'],
  },
  outputs: {
    type: 'object',
    properties: {
      items: { type: 'array', description: 'Kudos or tip feed items' },
      total: { type: 'integer', description: 'Result count' },
      kudos: { type: 'object', description: 'Single kudos detail' },
      tip: { type: 'object', description: 'Single tip detail' },
      received: { type: 'array', description: 'Tips received' },
      given: { type: 'array', description: 'Tips given' },
      totalReceived: { type: 'number' },
      totalGiven: { type: 'number' },
      streak: { type: 'object', description: 'Kudos streak data' },
      vouches: { type: 'array', description: 'Pending vouches' },
      count: { type: 'integer' },
      address: { type: 'string' },
      error: {
        type: 'string',
        description: 'Error message if the action failed',
      },
    },
  },
  version: '1.0.0',
  image: `${ACK_ORIGIN}/icon-512.png`,
  tags: ['kudos', 'tips', 'streaks', 'x402', 'erc-8004', 'ai'],
  pricing: kudosX402Pricing(),
  creatorAddress: lowercaseAddress(ACK_TREASURY_ADDRESS),
};
