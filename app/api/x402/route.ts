import { NextResponse } from 'next/server';

/**
 * X402 Payment Protocol endpoint for ACK Protocol.
 * Returns agent payment info including wallet address, supported assets, and pricing.
 */

const AGENT_OWNER_ADDRESS = process.env.AGENT_WALLET_ADDRESS;

const x402Info = {
  x402: true,
  status: 'experimental',
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
  description:
    'Experimental x402 discovery endpoint. Payment settlement and pay-then-retry execution are not enabled in production yet.',
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
  return NextResponse.json(
    {
      ...x402Info,
      error:
        'Not implemented: payment execution flow is disabled until pay-and-retry is production-ready.',
    },
    {
      status: 501,
      headers: {
        ...x402Headers,
      },
    }
  );
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: x402Headers,
    }
  );
}
