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
    image: 'https://ack-onchain.dev/ack-logo.png',
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
    ],
    active: true,
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
    ],
    supportedTrust: ['reputation', 'crypto-economic'],
  });
}
