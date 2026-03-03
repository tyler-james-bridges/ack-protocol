import { NextRequest, NextResponse } from 'next/server';
import {
  getStreakForAddress,
  getTopStreakers,
  getAllStreaks,
} from '@/lib/streaks';

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const addressesParam = searchParams.get('addresses');
  const topParam = searchParams.get('top');

  try {
    // Bulk lookup: ?addresses=0x...,0x...
    if (addressesParam) {
      const addresses = addressesParam
        .split(',')
        .filter((a) => ADDRESS_RE.test(a))
        .slice(0, 100);

      const all = await getAllStreaks();
      const result: Record<string, ReturnType<typeof Object>> = {};
      for (const addr of addresses) {
        const streak = all.get(addr.toLowerCase());
        if (streak) {
          result[addr.toLowerCase()] = streak;
        }
      }

      return NextResponse.json(result, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      });
    }

    // Top streakers: ?top=20
    if (topParam) {
      const limit = Math.min(parseInt(topParam, 10) || 20, 100);
      const top = await getTopStreakers(limit);
      return NextResponse.json(
        { streakers: top },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          },
        }
      );
    }

    return NextResponse.json(
      { error: 'Provide ?addresses= or ?top= parameter' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: `Failed to fetch streaks: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 502 }
    );
  }
}
