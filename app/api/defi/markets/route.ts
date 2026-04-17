import { NextResponse } from 'next/server';
import { listMarkets } from '@/lib/defi';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const markets = await listMarkets();
    return NextResponse.json(
      { markets, count: markets.length },
      {
        headers: {
          'Cache-Control': 'public, max-age=60',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
