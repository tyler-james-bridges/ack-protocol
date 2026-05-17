import { NextRequest, NextResponse } from 'next/server';
import { executeSwap, validateSwapParams } from '@/lib/defi';
import { withPayment } from '@/lib/x402';

export const dynamic = 'force-dynamic';

async function handler(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { from, to, amount, slippagePct } = body;

    if (!from || !to || !amount) {
      return NextResponse.json(
        { error: 'Required fields: from, to, amount' },
        { status: 400 }
      );
    }

    const validationError = validateSwapParams({
      from,
      to,
      amount,
      slippagePct,
    });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const result = await executeSwap({ from, to, amount, slippagePct });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const POST = withPayment(
  handler,
  '0.05',
  'Execute a token swap via Aborean DEX on Abstract'
);
