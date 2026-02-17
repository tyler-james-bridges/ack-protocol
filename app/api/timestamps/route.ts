import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { abstract } from 'viem/chains';

const client = createPublicClient({ chain: abstract, transport: http() });

// In-memory cache for block timestamps (they never change)
const timestampCache = new Map<string, number>();

export async function GET(req: NextRequest) {
  const blocks = req.nextUrl.searchParams.get('blocks');
  if (!blocks) {
    return NextResponse.json(
      { error: 'blocks param required' },
      { status: 400 }
    );
  }

  const blockNumbers = blocks.split(',').filter(Boolean).slice(0, 50);
  const result: Record<string, number> = {};
  const uncached: string[] = [];

  for (const bn of blockNumbers) {
    const cached = timestampCache.get(bn);
    if (cached !== undefined) {
      result[bn] = cached;
    } else {
      uncached.push(bn);
    }
  }

  if (uncached.length > 0) {
    await Promise.all(
      uncached.map(async (bn) => {
        try {
          const block = await client.getBlock({ blockNumber: BigInt(bn) });
          const ts = Number(block.timestamp);
          timestampCache.set(bn, ts);
          result[bn] = ts;
        } catch {
          // skip failed lookups
        }
      })
    );
  }

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
