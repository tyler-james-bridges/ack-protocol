import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { abstract } from 'viem/chains';
import { RateLimiter } from '@/lib/rate-limit';
import { createChallenge, getChallenge, markClaimed } from '@/lib/claim-store';

const HANDLE_REGISTRY =
  process.env.HANDLE_REGISTRY_ADDRESS ||
  '0xf32ed012f0978a9b963df11743e797a108c94871';

const IDENTITY_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';

const HANDLE_REGISTRY_ABI = [
  {
    name: 'exists',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'platform', type: 'string' },
      { name: 'handle', type: 'string' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'handleHash',
    type: 'function',
    stateMutability: 'pure',
    inputs: [
      { name: 'platform', type: 'string' },
      { name: 'handle', type: 'string' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'getHandle',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'hash', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'platform', type: 'string' },
          { name: 'handle', type: 'string' },
          { name: 'claimedBy', type: 'address' },
          { name: 'linkedAgentId', type: 'uint256' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'claimedAt', type: 'uint256' },
        ],
      },
    ],
  },
] as const;

const OWNER_OF_ABI = [
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

// 5 claims/hr per address
const limiter = new RateLimiter({ windowMs: 60 * 60 * 1000, maxRequests: 5 });

const client = createPublicClient({ chain: abstract, transport: http() });

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * GET /api/claim?handle=foo
 * Returns claim challenge status for a handle.
 */
export async function GET(request: NextRequest) {
  const handle = request.nextUrl.searchParams.get('handle');
  if (!handle) {
    return NextResponse.json(
      { error: 'Missing handle param' },
      { status: 400 }
    );
  }

  const entry = getChallenge(handle);
  if (!entry) {
    return NextResponse.json({ status: 'not_found' });
  }

  // full=true returns walletAddress and agentId (used by twitter-agent)
  const full = request.nextUrl.searchParams.get('full') === 'true';

  return NextResponse.json({
    status: entry.status,
    challenge: entry.status === 'pending' ? entry.challenge : undefined,
    txHash: entry.txHash,
    ...(full && {
      walletAddress: entry.walletAddress,
      agentId: entry.agentId,
    }),
  });
}

/**
 * POST /api/claim
 * Body: { handle, address, agentId }
 * Creates a claim challenge after validating ownership and handle state.
 */
export async function POST(request: NextRequest) {
  let body: { handle?: string; address?: string; agentId?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { handle, address, agentId } = body;
  if (!handle || !address || agentId === undefined) {
    return NextResponse.json(
      { error: 'Missing handle, address, or agentId' },
      { status: 400 }
    );
  }

  // Rate limit by address
  const rl = limiter.check(address);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Max 5 claim requests per hour.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  try {
    // 1. Validate handle is registered in HandleRegistry
    const exists = await client.readContract({
      address: HANDLE_REGISTRY as `0x${string}`,
      abi: HANDLE_REGISTRY_ABI,
      functionName: 'exists',
      args: ['x', handle.toLowerCase()],
    });

    if (!exists) {
      return NextResponse.json(
        { error: 'Handle not registered in HandleRegistry' },
        { status: 404 }
      );
    }

    // 2. Check handle is not already claimed
    const hash = await client.readContract({
      address: HANDLE_REGISTRY as `0x${string}`,
      abi: HANDLE_REGISTRY_ABI,
      functionName: 'handleHash',
      args: ['x', handle.toLowerCase()],
    });

    const handleData = await client.readContract({
      address: HANDLE_REGISTRY as `0x${string}`,
      abi: HANDLE_REGISTRY_ABI,
      functionName: 'getHandle',
      args: [hash],
    });

    if (handleData.claimedBy !== ZERO_ADDRESS) {
      return NextResponse.json(
        { error: 'Handle already claimed' },
        { status: 409 }
      );
    }

    // 3. Validate address owns agentId
    const owner = await client.readContract({
      address: IDENTITY_REGISTRY as `0x${string}`,
      abi: OWNER_OF_ABI,
      functionName: 'ownerOf',
      args: [BigInt(agentId)],
    });

    if (owner.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json(
        { error: 'Address does not own this agent' },
        { status: 403 }
      );
    }

    // Create challenge
    const { challenge, expiresAt } = createChallenge(handle, address, agentId);

    return NextResponse.json({ challenge, expiresAt });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 502 }
    );
  }
}

/**
 * PATCH /api/claim
 * Body: { handle, txHash }
 * Called by twitter-agent to mark a claim as completed.
 */
export async function PATCH(request: NextRequest) {
  let body: { handle?: string; txHash?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { handle, txHash } = body;
  if (!handle || !txHash) {
    return NextResponse.json(
      { error: 'Missing handle or txHash' },
      { status: 400 }
    );
  }

  const entry = getChallenge(handle);
  if (!entry) {
    return NextResponse.json(
      { error: 'No pending challenge for this handle' },
      { status: 404 }
    );
  }

  markClaimed(handle, txHash);
  return NextResponse.json({ status: 'claimed', txHash });
}
