import { NextResponse } from 'next/server';
import type { PaymentRequired, PaymentRequirements } from '@x402/next';
import { getX402ChainConfig } from '@/lib/x402';
import { resolvePaymentAddress } from '@/lib/tip-store';
import {
  USDC_DECIMALS,
  ACK_TREASURY_ADDRESS,
  getUsdcAddress,
} from '@/config/tokens';
import { DEFAULT_8004_CHAIN_ID, resolveChainId } from '@/config/chain';

const AGENT_OWNER_ADDRESS =
  process.env.AGENT_WALLET_ADDRESS ?? ACK_TREASURY_ADDRESS;

const x402Headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function buildPaymentRequirements(
  payTo: string,
  chainId: number = DEFAULT_8004_CHAIN_ID
): PaymentRequirements {
  const cfg = getX402ChainConfig(chainId);
  return {
    scheme: 'exact',
    network: cfg.network,
    asset: getUsdcAddress(cfg.chainId),
    amount: '1.00',
    payTo,
    maxTimeoutSeconds: 3600,
    extra: {
      name: 'USDC',
      decimals: USDC_DECIMALS,
      facilitatorUrl: cfg.facilitatorUrl,
    },
  };
}

function buildDiscoveryPayload(
  payTo: string,
  chainId: number = DEFAULT_8004_CHAIN_ID
): PaymentRequired {
  return {
    x402Version: 2,
    resource: {
      url: '/api/x402',
      description: 'ACK Protocol tip payments via x402',
      mimeType: 'application/json',
    },
    accepts: [buildPaymentRequirements(payTo, chainId)],
  };
}

/**
 * GET /api/x402
 *
 * x402 discovery endpoint. Returns payment requirements including
 * supported assets, network, and pay-to address for the ACK agent.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const chainId =
    resolveChainId(url.searchParams.get('chain') ?? undefined) ??
    resolveChainId(url.searchParams.get('chainId') ?? undefined) ??
    DEFAULT_8004_CHAIN_ID;

  return NextResponse.json(
    {
      ...buildDiscoveryPayload(AGENT_OWNER_ADDRESS, chainId),
      agent: 'ACK',
      agentId: '606',
      pricing: {
        tipMin: '0.01',
        tipMax: '100.00',
        currency: 'USD',
      },
      chainId,
      endpoints: {
        createTip: `/api/tips?chainId=${chainId}`,
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
  const chainId =
    resolveChainId(body.chainId as number | string | undefined) ??
    resolveChainId(body.chain as number | string | undefined) ??
    DEFAULT_8004_CHAIN_ID;

  let payTo = AGENT_OWNER_ADDRESS;
  if (agentId !== null) {
    payTo = await resolvePaymentAddress(agentId, chainId);
  }

  return NextResponse.json(buildDiscoveryPayload(payTo, chainId), {
    status: 402,
    headers: x402Headers,
  });
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: x402Headers });
}
