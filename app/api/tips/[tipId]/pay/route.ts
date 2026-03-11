import { NextRequest, NextResponse } from 'next/server';
import { withPayment } from '@/lib/x402';
import {
  getTip,
  completeTip,
  tipToJSON,
  resolvePaymentAddress,
} from '@/lib/tip-store';

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

  const tip = getTip(tipId);
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
  const completed = completeTip(tipId, 'x402-facilitator-settlement');
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

  const tip = getTip(tipId);
  if (!tip) {
    return NextResponse.json({ error: 'Tip not found' }, { status: 404 });
  }

  if (tip.status !== 'pending') {
    return handler(request);
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
