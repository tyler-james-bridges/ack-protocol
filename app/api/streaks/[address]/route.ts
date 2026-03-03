import { NextRequest, NextResponse } from 'next/server';
import { getStreakForAddress } from '@/lib/streaks';

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  if (!ADDRESS_RE.test(address)) {
    return NextResponse.json(
      { error: 'Invalid address format' },
      { status: 400 }
    );
  }

  try {
    const streak = await getStreakForAddress(address);
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
