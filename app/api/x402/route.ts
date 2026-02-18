import { NextResponse } from 'next/server';

/**
 * X402 Payment Protocol endpoint for ACK Protocol.
 * Returns agent payment info including wallet address, supported assets, and pricing.
 */

const AGENT_OWNER_ADDRESS = '0x668aDd9213985E7Fd613Aec87767C892f4b9dF1c';

const x402Info = {
  x402: true,
  agent: 'ACK',
  agentId: '606',
  chainId: 2741,
  paymentAddress: AGENT_OWNER_ADDRESS,
  supportedAssets: [
    {
      symbol: 'ETH',
      chainId: 2741,
      description: 'Native ETH on Abstract',
    },
  ],
  pricing: {
    currency: 'USD',
    endpoints: [
      {
        path: '/api/mcp',
        method: 'POST',
        pricePerCall: '0.00',
        description: 'Free tier: basic agent search and reputation queries.',
      },
      {
        path: '/api/mcp',
        method: 'POST',
        tool: 'reputation_analysis',
        pricePerCall: '0.01',
        description: 'Premium: detailed reputation analysis with trends.',
      },
    ],
  },
  description:
    'ACK Protocol supports X402 payment protocol for premium reputation data access.',
};

export async function GET() {
  return NextResponse.json(x402Info, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}
