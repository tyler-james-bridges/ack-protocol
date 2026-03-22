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
  buildMppChallengeResponse,
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
 * Build an RFC 9457 problem+json response for payment errors.
 */
function problemResponse(
  status: number,
  opts: {
    type?: string;
    title: string;
    detail: string;
    code?: string;
    extras?: Record<string, unknown>;
  }
): NextResponse {
  return NextResponse.json(
    {
      type: opts.type || 'about:blank',
      title: opts.title,
      status,
      detail: opts.detail,
      ...(opts.code && { code: opts.code }),
      ...(opts.extras || {}),
    },
    {
      status,
      headers: { 'Content-Type': 'application/problem+json' },
    }
  );
}

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
    let challenge: ReturnType<typeof buildMppChallenge> | undefined;
    try {
      challenge = buildMppChallenge(getMppConfig());
    } catch (err) {
      // MPP misconfigured — log but don't block x402 path
      console.error('[mpp] Config error:', err);
    }

    // Check for MPP credential in Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader?.toLowerCase().startsWith('payment ')) {
      if (!challenge) {
        return problemResponse(500, {
          title: 'MPP Configuration Error',
          detail: 'MPP is enabled but misconfigured on the server.',
          code: 'MPP_CONFIG_ERROR',
        });
      }

      let mpp;
      try {
        mpp = await verifyMppCredential(authHeader, {
          amount: tip.amountUsd.toFixed(2),
        });
      } catch (err) {
        return problemResponse(402, {
          type: 'https://paymentauth.org/problems/verification-failed',
          title: 'MPP Verification Error',
          detail:
            err instanceof Error ? err.message : 'MPP verification failed',
          code: 'MPP_VERIFY_ERROR',
        });
      }

      if (mpp.ok) {
        const mppProofId = `mpp:${mpp.receiptId}`;
        if (isProofReplayed(mppProofId)) {
          // Replay detected — return 402 with fresh challenge so client can retry
          const freshResponse = await buildFreshMppChallenge(tip, challenge);
          if (freshResponse) return freshResponse;

          return problemResponse(402, {
            type: 'https://paymentauth.org/problems/replay',
            title: 'Payment Proof Replayed',
            detail: 'This MPP payment proof has already been used.',
            code: 'PAYMENT_PROOF_REPLAYED',
            extras: { proofId: mppProofId },
          });
        }
        markProofUsed(mppProofId);

        // MPP verified — complete the tip
        const completed = await completeTip(tipId, 'mpp-settlement');
        if (!completed) {
          return NextResponse.json(
            { error: 'Failed to complete tip' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          status: 'paid',
          tip: tipToJSON(completed),
          message: `Tip of $${completed.amountUsd.toFixed(2)} paid via MPP`,
        });
      }

      // Credential provided but invalid — return 402 with fresh challenge
      if (mpp.userError) {
        const freshResponse = await buildFreshMppChallenge(tip, challenge);
        if (freshResponse) {
          // Append the error detail to the response body
          return freshResponse;
        }

        return problemResponse(402, {
          type: 'https://paymentauth.org/problems/invalid-credential',
          title: 'MPP Credential Invalid',
          detail: mpp.userError.message,
          code: mpp.userError.code,
        });
      }
    }

    // No MPP credential (or no auth header at all) — check for x402 proof
    const xPayment = request.headers.get('x-payment');

    // If client has not provided any payment proof, return dual challenge.
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

      const response = NextResponse.json(
        {
          type: 'https://paymentauth.org/problems/payment-required',
          title: 'Payment Required',
          status: 402,
          detail:
            'Payment required. Accepts x402 (X-Payment proof) or MPP (Authorization: Payment).',
          x402: x402Challenge,
          ...(challenge && { mpp: challenge }),
        },
        {
          status: 402,
          headers: { 'Content-Type': 'application/problem+json' },
        }
      );

      // Add WWW-Authenticate header for MPP
      if (challenge) {
        try {
          const mppChallengeResponse = await buildMppChallengeResponse({
            amount: price,
          });
          for (const [key, value] of mppChallengeResponse.headers.entries()) {
            if (key.toLowerCase() === 'www-authenticate') {
              response.headers.append('WWW-Authenticate', value);
            }
          }
        } catch {
          // MPP challenge build failed — still serve x402 challenge
        }

        if (!response.headers.get('WWW-Authenticate')) {
          response.headers.set(
            'WWW-Authenticate',
            `Payment realm="${challenge.realm}", asset="${challenge.asset}", payto="${challenge.payTo}"`
          );
        }
      }

      return response;
    }
  }

  // x402 path — replay guard then delegate to x402 withPayment
  const proofId = parseXPaymentProofId(request.headers.get('x-payment'));
  if (proofId) {
    if (isProofReplayed(proofId)) {
      return problemResponse(402, {
        type: 'https://paymentauth.org/problems/replay',
        title: 'Payment Proof Replayed',
        detail: 'Payment proof has already been used.',
        code: 'PAYMENT_PROOF_REPLAYED',
        extras: { proofId },
      });
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

/**
 * Build a fresh 402 MPP challenge response with WWW-Authenticate headers.
 * Used when a credential fails validation so the client can retry.
 */
async function buildFreshMppChallenge(
  tip: { amountUsd: number; agentId: number | string },
  challenge: { realm: string; payTo: string; asset: string }
): Promise<NextResponse | null> {
  try {
    const price = tip.amountUsd.toFixed(2);
    const mppChallengeResponse = await buildMppChallengeResponse({
      amount: price,
    });

    const response = NextResponse.json(
      {
        type: 'https://paymentauth.org/problems/payment-required',
        title: 'Payment Required',
        status: 402,
        detail: 'Previous payment credential was invalid. Please retry.',
        mpp: challenge,
      },
      {
        status: 402,
        headers: { 'Content-Type': 'application/problem+json' },
      }
    );

    for (const [key, value] of mppChallengeResponse.headers.entries()) {
      if (key.toLowerCase() === 'www-authenticate') {
        response.headers.append('WWW-Authenticate', value);
      }
    }

    if (!response.headers.get('WWW-Authenticate')) {
      response.headers.set(
        'WWW-Authenticate',
        `Payment realm="${challenge.realm}", asset="${challenge.asset}", payto="${challenge.payTo}"`
      );
    }

    return response;
  } catch {
    return null;
  }
}
