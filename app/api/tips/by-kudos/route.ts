import { NextResponse } from 'next/server';
import { getTipByKudosTxHash, tipToJSON } from '@/lib/tip-store';

interface TipFromAgent {
  name: string;
  imageUrl?: string;
  chainId: number;
  tokenId: string;
}

interface TipResult {
  amountUsd: number;
  fromAddress: string;
  fromAgentId?: number;
  fromAgent?: TipFromAgent;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const txHashes: string[] = body.txHashes;

    if (!Array.isArray(txHashes) || txHashes.length === 0) {
      return NextResponse.json({ tips: {} });
    }

    // Limit to 50 lookups per request
    const limited = txHashes.slice(0, 50);
    const tips: Record<string, TipResult> = {};

    await Promise.all(
      limited.map(async (hash) => {
        const tip = await getTipByKudosTxHash(hash);
        if (tip) {
          const json = tipToJSON(tip);
          const result: TipResult = {
            amountUsd: json.amountUsd,
            fromAddress: json.fromAddress,
            fromAgentId: json.fromAgentId,
          };

          // Resolve agent info from 8004scan if we have an agentId
          if (json.fromAgentId) {
            try {
              const scanRes = await fetch(
                `https://www.8004scan.io/api/v1/agents?search=${json.fromAgentId}&chain_id=2741&limit=5`
              );
              if (scanRes.ok) {
                const scanData = await scanRes.json();
                const match = (scanData.items || []).find(
                  (a: { token_id: string; chain_id: number }) =>
                    a.token_id === String(json.fromAgentId) &&
                    a.chain_id === 2741
                );
                if (match) {
                  result.fromAgent = {
                    name: match.name,
                    imageUrl: match.image_url || undefined,
                    chainId: match.chain_id,
                    tokenId: match.token_id,
                  };
                }
              }
            } catch {
              // Agent not found, leave fromAgent undefined
            }
          }

          tips[hash.toLowerCase()] = result;
        }
      })
    );

    return NextResponse.json({ tips });
  } catch {
    return NextResponse.json({ tips: {} });
  }
}
