import { NextResponse } from 'next/server';
import { getTipByKudosTxHash, tipToJSON } from '@/lib/tip-store';
import { fetchAgent } from '@/lib/api';

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
              const agent = await fetchAgent(`2741:${json.fromAgentId}`);
              if (agent) {
                result.fromAgent = {
                  name: agent.name,
                  imageUrl: agent.image_url || undefined,
                  chainId: agent.chain_id,
                  tokenId: agent.token_id,
                };
              }
            } catch {
              // Agent not found in 8004scan, leave fromAgent undefined
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
