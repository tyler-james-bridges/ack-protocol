import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { abstract } from 'viem/chains';
import { IDENTITY_REGISTRY_ABI } from '@/config/abi';
import { IDENTITY_REGISTRY_ADDRESS } from '@/config/contract';
import { createTip, tipToJSON } from '@/lib/tip-store';

const TIP_MIN = 0.01;
const TIP_MAX = 100;

const client = createPublicClient({ chain: abstract, transport: http() });

/**
 * POST /api/tips
 * Create a pending tip record. Returns payment info so the caller
 * can present a USDC transfer to the agent owner wallet.
 *
 * Body: { agentId: number, fromAddress: string, amountUsd: number, kudosTxHash?: string }
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { agentId, fromAddress, amountUsd, kudosTxHash } = body as {
    agentId?: number;
    fromAddress?: string;
    amountUsd?: number;
    kudosTxHash?: string;
  };

  // Validate required fields
  if (
    typeof agentId !== 'number' ||
    !Number.isInteger(agentId) ||
    agentId < 0
  ) {
    return NextResponse.json(
      { error: 'agentId must be a non-negative integer' },
      { status: 400 }
    );
  }

  if (
    typeof fromAddress !== 'string' ||
    !/^0x[a-fA-F0-9]{40}$/.test(fromAddress)
  ) {
    return NextResponse.json(
      { error: 'fromAddress must be a valid Ethereum address' },
      { status: 400 }
    );
  }

  if (
    typeof amountUsd !== 'number' ||
    amountUsd < TIP_MIN ||
    amountUsd > TIP_MAX
  ) {
    return NextResponse.json(
      { error: `amountUsd must be between ${TIP_MIN} and ${TIP_MAX}` },
      { status: 400 }
    );
  }

  // Resolve agent owner address from the identity registry
  let ownerAddress: string;
  try {
    ownerAddress = await client.readContract({
      address: IDENTITY_REGISTRY_ADDRESS,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'ownerOf',
      args: [BigInt(agentId)],
    });
  } catch {
    return NextResponse.json(
      { error: 'Agent not found in identity registry' },
      { status: 404 }
    );
  }

  const tip = createTip({
    kudosTxHash: kudosTxHash ?? '',
    agentId,
    fromAddress,
    toAddress: ownerAddress,
    amountUsd,
  });

  return NextResponse.json({
    tipId: tip.id,
    paymentAddress: tip.toAddress,
    amount: tip.amountUsd,
    token: 'USDC',
    chainId: 2741,
    tip: tipToJSON(tip),
  });
}
