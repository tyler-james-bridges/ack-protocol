import { NextResponse } from 'next/server';
import type { PaymentRequired, PaymentRequirements } from '@x402/next';
import { resolvePaymentAddress } from '@/lib/tip-store';
import {
  USDC_ADDRESS,
  USDC_DECIMALS,
  ACK_TREASURY_ADDRESS,
} from '@/config/tokens';

const AGENT_OWNER_ADDRESS =
  process.env.AGENT_WALLET_ADDRESS ?? ACK_TREASURY_ADDRESS;

const x402Headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function buildPaymentRequirements(payTo: string): PaymentRequirements {
  return {
    scheme: 'exact',
    network: 'eip155:2741',
    asset: USDC_ADDRESS,
    amount: '1.00',
    payTo,
    maxTimeoutSeconds: 3600,
    extra: {
      name: 'USDC',
      decimals: USDC_DECIMALS,
    },
  };
}

function buildDiscoveryPayload(payTo: string): PaymentRequired {
  return {
    x402Version: 2,
    resource: {
      url: '/api/x402',
      description: 'ACK Protocol tip payments via x402',
      mimeType: 'application/json',
    },
    accepts: [buildPaymentRequirements(payTo)],
  };
}

/**
 * GET /api/x402
 *
 * x402 discovery endpoint. Returns payment requirements including
 * supported assets, network, and pay-to address for the ACK agent.
 */
export async function GET() {
  return NextResponse.json(
    {
      ...buildDiscoveryPayload(AGENT_OWNER_ADDRESS),
      facilitator: 'https://facilitator.x402.abs.xyz',
      agent: 'ACK',
      agentId: '606',
      pricing: {
        tipMin: '0.01',
        tipMax: '100.00',
        currency: 'USD',
      },
      endpoints: {
        createTip: '/api/tips',
        verifyTip: '/api/tips/{tipId}/verify',
        tipPage: '/tip/{tipId}',
      },
    },
    {
      status: 200,
      headers: {
        ...x402Headers,
        'Cache-Control': 'public, max-age=3600',
      },
    }
  );
}

/**
 * POST /api/x402
 *
 * Resolve payment requirements for a specific agent. Looks up the
 * agent owner from the identity registry, falls back to the treasury.
 *
 * Body: { agentId?: number }
 */
export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine, use defaults
  }

  const agentId = typeof body.agentId === 'number' ? body.agentId : null;

  let payTo = AGENT_OWNER_ADDRESS;
  if (agentId !== null) {
    payTo = await resolvePaymentAddress(agentId);
  }

  return NextResponse.json(buildDiscoveryPayload(payTo), {
    status: 402,
    headers: x402Headers,
  });
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: x402Headers });
}
