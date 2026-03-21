import { NextRequest, NextResponse } from 'next/server';
import { withPayment } from '@/lib/x402';
import {
  getTip,
  completeTip,
  tipToJSON,
  resolvePaymentAddress,
} from '@/lib/tip-store';
import {
  buildMppChallenge,
  getMppConfig,
  mppEnabled,
  verifyMppCredential,
} from '@/lib/payments/mpp';
import {
  isProofReplayed,
  markProofUsed,
  parseXPaymentProofId,
} from '@/lib/payments/replay';

/**
 * GET /api/tips/[tipId]/pay
 *
 * x402-gated tip payment endpoint. Returns 402 with the tip amount as the
 * price. When paid via x402, marks the tip as completed and returns
 * confirmation.
 *
 * Flow:
 * 1. Client GETs this endpoint
 * 2. Server returns 402 with payment requirements (tip amount in USDC)
 * 3. Client signs payment via x402 (EIP-3009 transferWithAuthorization)
 * 4. Facilitator settles USDC onchain
 * 5. Server marks tip as completed, returns confirmation
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handler(request: NextRequest): Promise<NextResponse<any>> {
  const tipId = request.nextUrl.pathname.split('/').slice(-2)[0];

  const tip = await getTip(tipId);
  if (!tip) {
    return NextResponse.json({ error: 'Tip not found' }, { status: 404 });
  }

  if (tip.status === 'completed') {
    return NextResponse.json({
      status: 'already_paid',
      tip: tipToJSON(tip),
    });
  }

  if (tip.status === 'expired') {
    return NextResponse.json({ error: 'Tip has expired' }, { status: 410 });
  }

  // Mark the tip as completed (x402 facilitator already settled the payment)
  const completed = await completeTip(tipId, 'x402-facilitator-settlement');
  if (!completed) {
    return NextResponse.json(
      { error: 'Failed to complete tip' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    status: 'paid',
    tip: tipToJSON(completed),
    message: `Tip of $${completed.amountUsd.toFixed(2)} paid via x402`,
  });
}

/**
 * Dynamic x402 wrapper that reads the tip amount and pay-to address
 * from the tip record, then gates the endpoint accordingly.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tipId: string }> }
) {
  const { tipId } = await params;

  const tip = await getTip(tipId);
  if (!tip) {
    return NextResponse.json({ error: 'Tip not found' }, { status: 404 });
  }

  if (tip.status !== 'pending') {
    return handler(request);
  }

  if (mppEnabled()) {
    let challenge;
    try {
      challenge = buildMppChallenge(getMppConfig());
    } catch (err) {
      return NextResponse.json(
        {
          error: {
            code: 'MPP_CONFIG_INVALID',
            message:
              err instanceof Error ? err.message : 'Invalid MPP configuration',
          },
        },
        { status: 500 }
      );
    }

    let mpp;
    try {
      mpp = await verifyMppCredential(request.headers.get('authorization'), {
        amount: tip.amountUsd.toFixed(2),
      });
    } catch (err) {
      return NextResponse.json(
        {
          error: {
            code: 'MPP_VERIFY_ERROR',
            message:
              err instanceof Error ? err.message : 'MPP verification failed',
          },
        },
        { status: 500 }
      );
    }

    if (mpp.ok) {
      const mppProofId = `mpp:${mpp.receiptId}`;
      if (isProofReplayed(mppProofId)) {
        return NextResponse.json(
          {
            error: {
              code: 'PAYMENT_PROOF_REPLAYED',
              message: 'MPP payment proof has already been used.',
              proofId: mppProofId,
            },
          },
          { status: 402 }
        );
      }
      markProofUsed(mppProofId);
      return handler(request);
    }

    const xPayment = request.headers.get('x-payment');

    // If client has not provided x402 proof, return dual challenge.
    if (!xPayment) {
      const payTo = await resolvePaymentAddress(tip.agentId);
      const price = tip.amountUsd.toFixed(2);
      const x402Challenge = {
        scheme: 'exact',
        network: 'eip155:2741',
        payTo,
        price,
        message: `Tip $${price} to Agent #${tip.agentId} via x402`,
      };

      return NextResponse.json(
        {
          error: {
            code: 'PAYMENT_REQUIRED',
            message:
              'Payment required. Accepts x402 (X-Payment proof) or MPP (Authorization: Payment).',
            x402: x402Challenge,
            mpp: challenge,
          },
        },
        {
          status: 402,
          headers: {
            'WWW-Authenticate': `Payment realm="${challenge.realm}", asset="${challenge.asset}", payto="${challenge.payTo}"`,
          },
        }
      );
    }
  }

  const proofId = parseXPaymentProofId(request.headers.get('x-payment'));
  if (proofId) {
    if (isProofReplayed(proofId)) {
      return NextResponse.json(
        {
          error: {
            code: 'PAYMENT_PROOF_REPLAYED',
            message: 'Payment proof has already been used.',
            proofId,
          },
        },
        { status: 402 }
      );
    }

    // Pre-mark proof id to prevent rapid replay attempts against the same tip path.
    markProofUsed(proofId);
  }

  const payTo = await resolvePaymentAddress(tip.agentId);
  const price = tip.amountUsd.toFixed(2);

  const gatedHandler = withPayment(
    handler,
    price,
    `Tip $${price} to Agent #${tip.agentId} via x402`,
    payTo
  );

  return gatedHandler(request);
}
