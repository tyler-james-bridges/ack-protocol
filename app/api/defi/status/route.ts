import { NextResponse } from 'next/server';
import { getPortfolioStatus } from '@/lib/defi';
import { AGW_ADDRESS } from '@/lib/defi/constants';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const status = await getPortfolioStatus(AGW_ADDRESS);
    return NextResponse.json(status, {
      headers: {
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
