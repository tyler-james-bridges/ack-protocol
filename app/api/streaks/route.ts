import { NextRequest, NextResponse } from 'next/server';
import {
  getStreakForAddress,
  getTopStreakers,
  getAllStreaks,
} from '@/lib/streaks';
import { getAllFeedbackEvents } from '@/lib/feedback-cache';
import { resolveChainId } from '@/config/chain';

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const addressesParam = searchParams.get('addresses');
  const topParam = searchParams.get('top');
  const chainParam = searchParams.get('chainId');
  const chainId = resolveChainId(chainParam ?? undefined);
  if (chainParam && chainId === undefined) {
    return NextResponse.json({ error: 'Unsupported chainId' }, { status: 400 });
  }

  try {
    // Bulk lookup: ?addresses=0x...,0x...
    if (addressesParam) {
      const addresses = addressesParam
        .split(',')
        .filter((a) => ADDRESS_RE.test(a))
        .slice(0, 100);

      const all = await getAllStreaks(chainId);
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
    if (topParam !== null) {
      const limit = Math.min(parseInt(topParam, 10) || 20, 100);
      const [top, events] = await Promise.all([
        limit > 0 ? getTopStreakers(limit, chainId) : Promise.resolve([]),
        getAllFeedbackEvents(chainId),
      ]);
      return NextResponse.json(
        { streakers: top, totalKudos: events.length },
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
