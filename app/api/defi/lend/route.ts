import { NextRequest, NextResponse } from 'next/server';
import { executeLend, validateLendParams } from '@/lib/defi';
import { withPayment } from '@/lib/x402';

export const dynamic = 'force-dynamic';

async function handler(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { action, amount } = body;

    if (!action || !amount) {
      return NextResponse.json(
        {
          error:
            'Required fields: action (supply|borrow|repay|withdraw), amount',
        },
        { status: 400 }
      );
    }

    const validationError = validateLendParams({ action, amount });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const result = await executeLend({ action, amount });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const POST = withPayment(
  handler,
  '0.05',
  'Morpho Blue lending operation on Abstract'
);
