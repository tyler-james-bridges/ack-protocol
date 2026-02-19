import { NextResponse } from 'next/server';

/**
 * X402 Payment Protocol endpoint for ACK Protocol.
 * Returns agent payment info including wallet address, supported assets, and pricing.
 */

const AGENT_OWNER_ADDRESS = process.env.AGENT_WALLET_ADDRESS;

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

const x402Headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function GET() {
  if (!AGENT_OWNER_ADDRESS) {
    return NextResponse.json(
      { error: 'x402 service not configured: AGENT_WALLET_ADDRESS not set' },
      { status: 503, headers: x402Headers }
    );
  }
  return NextResponse.json(x402Info, {
    status: 200,
    headers: {
      ...x402Headers,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export async function POST() {
  if (!AGENT_OWNER_ADDRESS) {
    return NextResponse.json(
      { error: 'x402 service not configured: AGENT_WALLET_ADDRESS not set' },
      { status: 503, headers: x402Headers }
    );
  }
  return NextResponse.json(x402Info, {
    status: 402,
    headers: {
      ...x402Headers,
      'X-Payment-Required': 'true',
      'X-Payment-Address': AGENT_OWNER_ADDRESS,
      'X-Payment-Chain': '2741',
    },
  });
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: x402Headers,
    }
  );
}
