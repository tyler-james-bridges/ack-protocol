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
 *
 * All 402 responses include a `WWW-Authenticate: Payment` header so clients
 * can programmatically detect the payment challenge per RFC 9110 Section 11.6.1.
 */
function problemResponse(
  status: number,
  opts: {
    type?: string;
    title: string;
    detail: string;
    code?: string;
    extras?: Record<string, unknown>;
    wwwAuthenticate?: string;
  }
): NextResponse {
  const headers: Record<string, string> = {
    'Content-Type': 'application/problem+json',
  };

  // All 402 responses MUST include WWW-Authenticate (RFC 9110 Section 11.6.1)
  if (status === 402) {
    headers['WWW-Authenticate'] =
      opts.wwwAuthenticate || 'Payment realm="ack-protocol"';
  }

  return NextResponse.json(
    {
      type: opts.type || 'about:blank',
      title: opts.title,
      status,
      detail: opts.detail,
      ...(opts.code && { code: opts.code }),
      ...(opts.extras || {}),
    },
    { status, headers }
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
        console.log(
          '[mpp] Verifying credential, amount:',
          tip.amountUsd.toFixed(2),
          'auth:',
          authHeader?.substring(0, 60) + '...'
        );
        mpp = await verifyMppCredential(authHeader, {
          amount: tip.amountUsd.toFixed(2),
        });
        console.log(
          '[mpp] Verify result:',
          JSON.stringify({
            ok: mpp.ok,
            receiptId: mpp.receiptId,
            error: mpp.error,
            code: mpp.userError?.code,
          })
        );
      } catch (err) {
        console.error('[mpp] Verify threw:', err);
        return problemResponse(402, {
          type: 'https://paymentauth.org/problems/verification-failed',
          title: 'MPP Verification Error',
          detail:
            err instanceof Error ? err.message : 'MPP verification failed',
          code: 'MPP_VERIFY_ERROR',
          wwwAuthenticate: `Payment realm="${challenge.realm}", asset="${challenge.asset}"`,
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
            wwwAuthenticate: `Payment realm="${challenge.realm}", asset="${challenge.asset}"`,
          });
        }
        markProofUsed(mppProofId);

        // MPP verified — extract Tempo tx hash from receipt
        let tempoTxHash = '';
        if (mpp.receiptId) {
          try {
            const padded =
              mpp.receiptId + '='.repeat((4 - (mpp.receiptId.length % 4)) % 4);
            const decoded = JSON.parse(
              Buffer.from(padded, 'base64url').toString()
            );
            tempoTxHash = decoded.reference || '';
          } catch {
            // Receipt not decodable — use raw ID
          }
        }
        const mppTxRef = tempoTxHash
          ? `mpp:${tempoTxHash}`
          : `mpp:${mpp.receiptId || 'settlement'}`;
        const completed = await completeTip(tipId, mppTxRef);
        if (!completed) {
          return NextResponse.json(
            { error: 'Failed to complete tip' },
            { status: 500 }
          );
        }

        return NextResponse.json(
          {
            status: 'paid',
            tip: tipToJSON(completed),
            message: `Tip of $${completed.amountUsd.toFixed(2)} paid via MPP`,
          },
          {
            headers: {
              'Payment-Receipt': mpp.receiptId || '',
            },
          }
        );
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
          wwwAuthenticate: `Payment realm="${challenge.realm}", asset="${challenge.asset}"`,
        });
      }
    }

    // No MPP credential — fall through to x402 path below.
    // The x402 withPayment wrapper will generate a standard 402 that
    // x402 clients can parse. We add MPP WWW-Authenticate headers to
    // the x402 response via a response interceptor below.
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
