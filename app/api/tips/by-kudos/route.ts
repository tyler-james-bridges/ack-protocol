import { NextResponse } from 'next/server';
import { getTipByKudosTxHash, tipToJSON } from '@/lib/tip-store';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const txHashes: string[] = body.txHashes;

    if (!Array.isArray(txHashes) || txHashes.length === 0) {
      return NextResponse.json({ tips: {} });
    }

    // Limit to 50 lookups per request
    const limited = txHashes.slice(0, 50);
    const tips: Record<
      string,
      { amountUsd: number; fromAddress: string; fromAgentId?: number }
    > = {};

    await Promise.all(
      limited.map(async (hash) => {
        const tip = await getTipByKudosTxHash(hash);
        if (tip) {
          const json = tipToJSON(tip);
          tips[hash.toLowerCase()] = {
            amountUsd: json.amountUsd,
            fromAddress: json.fromAddress,
            fromAgentId: json.fromAgentId,
          };
        }
      })
    );

    return NextResponse.json({ tips });
  } catch {
    return NextResponse.json({ tips: {} });
  }
}
