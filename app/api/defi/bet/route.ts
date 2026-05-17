import { NextRequest, NextResponse } from 'next/server';
import { placeBet, validateBetParams } from '@/lib/defi';
import { withPayment } from '@/lib/x402';

export const dynamic = 'force-dynamic';

async function handler(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { marketId, outcomeIndex, amount } = body;

    if (marketId === undefined || outcomeIndex === undefined || !amount) {
      return NextResponse.json(
        { error: 'Required fields: marketId, outcomeIndex, amount' },
        { status: 400 }
      );
    }

    const validationError = validateBetParams({
      marketId: String(marketId),
      outcomeIndex: Number(outcomeIndex),
      amount: String(amount),
    });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const result = await placeBet({
      marketId: String(marketId),
      outcomeIndex: Number(outcomeIndex),
      amount: String(amount),
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const POST = withPayment(
  handler,
  '0.05',
  'Place a Myriad prediction market bet on Abstract'
);
