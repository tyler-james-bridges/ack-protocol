import { encodeFunctionData } from 'viem';
import { abstract } from 'viem/chains';
import { withSiwa, siwaOptions } from '@buildersgarden/siwa/next';
import { RateLimiter } from '@/lib/rate-limit';
import { IDENTITY_REGISTRY_ABI } from '@/config/abi';
import { IDENTITY_REGISTRY_ADDRESS } from '@/config/contract';
import { getVouches } from '@/lib/vouch-store';
import type { ScanAgentsResponse } from '@/lib/api';

const API_BASE = 'https://www.8004scan.io/api/v1';

const limiter = new RateLimiter({ windowMs: 60 * 60 * 1000, maxRequests: 30 });

/**
 * Search 8004scan for agents matching an address across all chains.
 * Hits the upstream API directly (server-side, no CORS concern).
 */
async function searchAgentsByAddress(
  address: string
): Promise<ScanAgentsResponse> {
  const params = new URLSearchParams({
    search: address,
    limit: '50',
  });

  const response = await fetch(`${API_BASE}/agents?${params.toString()}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 30 },
  });

  if (!response.ok) {
    throw new Error(`8004scan error: ${response.status}`);
  }

  return response.json();
}

/**
 * POST /api/onboard
 * Agent-first programmatic onboarding endpoint.
 *
 * Authenticates via SIWA (ERC-8128), resolves the agent's identity across
 * all ERC-8004 chains. If not registered, returns instructions to register
 * on Abstract.
 *
 * Requires: X-SIWA-Receipt header + ERC-8128 signed request.
 */
export const POST = withSiwa(async (agent) => {
  // Rate limit: 30 requests/hour per address
  const rateLimit = limiter.check(agent.address);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded. Max 30 onboard requests per hour.',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)),
          'Retry-After': String(
            Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
          ),
        },
      }
    );
  }

  // Search 8004scan across all chains for this address
  let data: ScanAgentsResponse;
  try {
    data = await searchAgentsByAddress(agent.address);
  } catch {
    return new Response(
      JSON.stringify({ error: 'Failed to query agent registry' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Filter to agents where this address is owner, creator, or agent wallet
  const addr = agent.address.toLowerCase();
  const matches = (data.items || []).filter(
    (a) =>
      a.owner_address?.toLowerCase() === addr ||
      a.creator_address?.toLowerCase() === addr ||
      a.agent_wallet?.toLowerCase() === addr
  );

  if (matches.length > 0) {
    // Collect unique chains the agent is registered on
    const chains = [...new Set(matches.map((a) => a.chain_id))];

    // Use the first match as the primary agent identity
    const primary = matches[0];

    return {
      status: 'found',
      agent: {
        id: primary.token_id,
        name: primary.name,
        description: primary.description,
        chainId: primary.chain_id,
        owner: primary.owner_address,
        wallet: primary.agent_wallet,
        isActive: primary.is_active,
        isVerified: primary.is_verified,
        totalScore: primary.total_score,
        totalFeedbacks: primary.total_feedbacks,
      },
      chains,
      allRegistrations: matches.map((a) => ({
        id: a.token_id,
        chainId: a.chain_id,
        name: a.name,
      })),
      ackProfileUrl: `/agent/${primary.chain_id}:${primary.token_id}`,
      rateLimit: { remaining: rateLimit.remaining, resetAt: rateLimit.resetAt },
    };
  }

  // Not registered on any chain -- return registration instructions
  const registerCalldata = encodeFunctionData({
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'register',
    args: [''],
  });

  // Check for pending vouches — incentivizes registration
  const pending = getVouches(agent.address);

  return {
    status: 'not_registered',
    registerUrl: '/register',
    abstractRegistration: {
      contract: IDENTITY_REGISTRY_ADDRESS,
      function: 'register(string)',
      chain: 'abstract',
      chainId: abstract.id,
      calldata: registerCalldata,
    },
    pendingVouches:
      pending.count > 0
        ? { count: pending.count, vouches: pending.vouches }
        : undefined,
    rateLimit: { remaining: rateLimit.remaining, resetAt: rateLimit.resetAt },
  };
});

// CORS preflight for ERC-8128 headers
export { siwaOptions as OPTIONS };
