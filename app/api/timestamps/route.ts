import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import {
  DEFAULT_8004_CHAIN_ID,
  SUPPORTED_8004_CHAINS,
  resolveChainId,
} from '@/config/chain';

const clients = new Map<number, ReturnType<typeof createPublicClient>>();

function getClient(chainId: number) {
  const existing = clients.get(chainId);
  if (existing) return existing;
  const cfg = SUPPORTED_8004_CHAINS[chainId];
  if (!cfg) throw new Error(`Unsupported chain: ${chainId}`);
  const client = createPublicClient({
    chain: cfg.chain,
    transport: http(cfg.rpcUrl),
  });
  clients.set(chainId, client);
  return client;
}

// In-memory cache for block timestamps (they never change)
const timestampCache = new Map<string, number>();

export async function GET(req: NextRequest) {
  const blocks = req.nextUrl.searchParams.get('blocks');
  const chainId =
    resolveChainId(req.nextUrl.searchParams.get('chainId') ?? undefined) ??
    DEFAULT_8004_CHAIN_ID;
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
    const cacheKey = `${chainId}:${bn}`;
    const cached = timestampCache.get(cacheKey);
    if (cached !== undefined) {
      result[bn] = cached;
    } else {
      uncached.push(bn);
    }
  }

  if (uncached.length > 0) {
    const client = getClient(chainId);
    await Promise.all(
      uncached.map(async (bn) => {
        try {
          const block = await client.getBlock({ blockNumber: BigInt(bn) });
          const ts = Number(block.timestamp);
          timestampCache.set(`${chainId}:${bn}`, ts);
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
