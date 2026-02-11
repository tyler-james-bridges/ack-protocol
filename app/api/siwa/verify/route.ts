import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { abstract } from 'viem/chains';
import { verifySIWA, buildSIWAResponse } from '@buildersgarden/siwa';
import { createReceipt } from '@buildersgarden/siwa/receipt';
import { REPUTATION_REGISTRY_ADDRESS } from '@/config/contract';

const DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'ack-protocol.vercel.app';
const SIWA_SECRET = process.env.RECEIPT_SECRET || process.env.SIWA_SECRET;

const client = createPublicClient({
  chain: abstract,
  transport: http(),
});

/**
 * POST /api/siwa/verify
 * Verify a SIWA signature and return a receipt for subsequent requests.
 *
 * Body: { message: string, signature: string, nonceToken: string }
 */
export async function POST(request: NextRequest) {
  if (!SIWA_SECRET) {
    return NextResponse.json(
      { error: 'Server misconfigured: SIWA secret not set' },
      { status: 500 }
    );
  }

  try {
    const { message, signature, nonceToken } = await request.json();

    if (!message || !signature) {
      return NextResponse.json(
        { status: 'rejected', code: 'VERIFICATION_FAILED', error: 'Missing message or signature' },
        { status: 400 }
      );
    }

    if (!nonceToken) {
      return NextResponse.json(
        { status: 'rejected', code: 'INVALID_NONCE', error: 'Missing nonceToken' },
        { status: 400 }
      );
    }

    const result = await verifySIWA(
      message,
      signature as `0x${string}`,
      DOMAIN,
      { nonceToken, secret: SIWA_SECRET },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client as any,
      {
        mustBeActive: true,
        minScore: 0,
        reputationRegistryAddress: REPUTATION_REGISTRY_ADDRESS,
      }
    );

    if (!result.valid) {
      return NextResponse.json(
        buildSIWAResponse(result),
        { status: result.code === 'NOT_REGISTERED' ? 403 : 401 }
      );
    }

    const receiptResult = createReceipt(
      {
        address: result.address,
        agentId: result.agentId,
        agentRegistry: result.agentRegistry,
        chainId: result.chainId,
        verified: result.verified,
      },
      { secret: SIWA_SECRET }
    );

    return NextResponse.json({
      status: 'authenticated',
      receipt: receiptResult.receipt,
      receiptExpiresAt: new Date(receiptResult.expiresAt).toISOString(),
      address: result.address,
      agentId: result.agentId,
      agentRegistry: result.agentRegistry,
      chainId: result.chainId,
      verified: result.verified,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
