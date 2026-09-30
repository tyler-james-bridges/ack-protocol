import { NextRequest, NextResponse } from 'next/server';
import { getStreakForAddress } from '@/lib/streaks';
import { resolveChainId } from '@/config/chain';

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const chainParam = req.nextUrl.searchParams.get('chainId');
  const chainId = resolveChainId(chainParam ?? undefined);
  if (chainParam && chainId === undefined) {
    return NextResponse.json({ error: 'Unsupported chainId' }, { status: 400 });
  }

  if (!ADDRESS_RE.test(address)) {
    return NextResponse.json(
      { error: 'Invalid address format' },
      { status: 400 }
    );
  }

  try {
    const streak = await getStreakForAddress(address, chainId);
    return NextResponse.json(streak, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Failed to fetch streak: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 502 }
    );
  }
}
