import { NextRequest, NextResponse } from 'next/server';
import { isAddress, createPublicClient, http } from 'viem';
import { abstract } from 'viem/chains';
import { createSIWANonce } from '@buildersgarden/siwa';

const SIWA_SECRET = process.env.RECEIPT_SECRET || process.env.SIWA_SECRET;

const client = createPublicClient({
  chain: abstract,
  transport: http(),
});

/**
 * POST /api/siwa/nonce
 * Request a nonce for SIWA authentication.
 * Checks onchain registration before issuing.
 *
 * Body: { address: string, agentId: number, agentRegistry: string }
 */
export async function POST(request: NextRequest) {
  if (!SIWA_SECRET) {
    return NextResponse.json(
      { error: 'Server misconfigured: SIWA secret not set' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { address, agentId, agentRegistry } = body;

    if (!address || !isAddress(address)) {
      return NextResponse.json(
        { error: 'Valid Ethereum address required' },
        { status: 400 }
      );
    }

    if (agentId === undefined || agentId === null) {
      return NextResponse.json(
        { error: 'agentId required' },
        { status: 400 }
      );
    }

    if (!agentRegistry || typeof agentRegistry !== 'string') {
      return NextResponse.json(
        { error: 'agentRegistry required (e.g. eip155:2741:0x8004A169...)' },
        { status: 400 }
      );
    }

    const result = await createSIWANonce(
      { address, agentId, agentRegistry },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client as any,
      { secret: SIWA_SECRET },
    );

    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);

    if (msg.includes('not registered') || msg.includes('NOT_REGISTERED')) {
      return NextResponse.json(
        {
          status: 'not_registered',
          code: 'NOT_REGISTERED',
          error: 'Agent is not registered onchain',
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Nonce creation failed' },
      { status: 400 }
    );
  }
}
