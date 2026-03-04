import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { abstract } from 'viem/chains';
import { getTip, tipToJSON } from '@/lib/tip-store';
import { IDENTITY_REGISTRY_ABI } from '@/config/abi';
import { IDENTITY_REGISTRY_ADDRESS } from '@/config/contract';

const client = createPublicClient({ chain: abstract, transport: http() });

/**
 * GET /api/tips/[tipId]
 * Returns the current status of a tip record, enriched with agent metadata.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tipId: string }> }
) {
  const { tipId } = await params;

  const tip = getTip(tipId);
  if (!tip) {
    return NextResponse.json({ error: 'Tip not found' }, { status: 404 });
  }

  // Try to resolve agent name from the registry
  let agentName = `Agent #${tip.agentId}`;
  try {
    const uri = (await client.readContract({
      address: IDENTITY_REGISTRY_ADDRESS,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'tokenURI',
      args: [BigInt(tip.agentId)],
    })) as string;
    if (uri.startsWith('data:')) {
      const base64 = uri.split(',')[1];
      const json = JSON.parse(Buffer.from(base64, 'base64').toString());
      if (json.name) agentName = json.name;
    }
  } catch {
    // Fallback to generic name
  }

  return NextResponse.json({
    tip: {
      ...tipToJSON(tip),
      agentName,
      agentImageUrl: null,
      agentTokenId: String(tip.agentId),
      agentChainId: 2741,
      message: null,
    },
  });
}
