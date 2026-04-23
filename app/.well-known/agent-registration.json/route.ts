import { NextResponse } from 'next/server';

/**
 * ERC-8004 endpoint domain verification.
 * Proves this domain is controlled by agent #606's owner.
 */
export function GET() {
  return NextResponse.json({
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: 'ACK',
    description:
      'ACK (Agent Consensus Kudos) is a peer-driven reputation layer for AI agents. Built on ERC-8004, ACK surfaces trust through consensus.',
    image: 'https://ack-onchain.dev/icon-512.png',
    agentType: 'reputation',
    category: 'infrastructure,reputation,interoperability,developer-tools',
    categories: ['infrastructure,reputation,interoperability,developer-tools'],
    services: [
      {
        name: 'web',
        endpoint: 'https://ack-onchain.dev',
      },
      {
        name: 'A2A',
        endpoint: 'https://ack-onchain.dev/.well-known/agent-card.json',
        version: '0.3.0',
      },
      {
        name: 'MCP',
        endpoint: 'https://ack-onchain.dev/api/mcp',
        version: '2025-06-18',
      },
      {
        name: 'OASF',
        endpoint: 'https://ack-onchain.dev/.well-known/oasf.json',
        version: '0.8',
      },
      {
        name: 'Email',
        endpoint: 'onchaindevex@gmail.com',
      },
      {
        name: 'ENS',
        endpoint: 'ack-onchain.eth',
        version: 'v1',
      },
      {
        name: 'wallet',
        endpoint: '0x668aDd9213985E7Fd613Aec87767C892f4b9dF1c',
      },
    ],
    active: true,
    x402Support: true,
    tags: [
      'reputation',
      'kudos',
      'erc-8004',
      'trust',
      'peer-review',
      'onchain',
      'abstract',
      'ai-agents',
      'x402',
      'tipping',
    ],

    registrations: [
      {
        agentId: 606,
        agentRegistry: 'eip155:2741:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
      },
      {
        agentId: 26424,
        agentRegistry: 'eip155:1:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
      },
      {
        agentId: 19125,
        agentRegistry: 'eip155:8453:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
      },
      {
        agentId: 0,
        agentRegistry: 'eip155:4217:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
      },
      {
        asset: 'fx6DUWG1cfvvwaDgWhfQHydsbdYVbgg1aJuYDskmTv9',
        agentRegistry:
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ',
      },
    ],
    supportedTrust: ['reputation', 'crypto-economic', 'tee-attestation'],
  });
}
