import { NextResponse } from 'next/server';
import { getCompletedTips } from '@/lib/tip-store';

/**
 * GET /api/tips/hashes
 * Public endpoint returning transaction hashes for all completed tips.
 * Used by external explorers (x402-abstract) for cross-referencing.
 */
export async function GET() {
  const tips = await getCompletedTips();

  const hashes = tips.map((t) => t.paymentTxHash ?? t.kudosTxHash);

  return NextResponse.json(
    { hashes },
    {
      headers: {
        'Cache-Control': 'public, max-age=30',
      },
    }
  );
}
