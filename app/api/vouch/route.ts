import { isAddress } from 'viem';
import { withSiwa, siwaOptions } from '@buildersgarden/siwa/next';
import { RateLimiter } from '@/lib/rate-limit';
import { addVouch } from '@/lib/vouch-store';
import { KUDOS_CATEGORIES, type KudosCategory } from '@/config/contract';
import type { ScanAgentsResponse } from '@/lib/api';

const API_BASE = 'https://www.8004scan.io/api/v1';

/** 5 vouches per hour per agent */
const limiter = new RateLimiter({ windowMs: 60 * 60 * 1000, maxRequests: 5 });

/**
 * Check whether an address has an ERC-8004 identity on any chain.
 * Returns true if at least one registration is found.
 */
async function isRegistered(address: string): Promise<boolean> {
  const params = new URLSearchParams({ search: address, limit: '10' });

  const response = await fetch(`${API_BASE}/agents?${params.toString()}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 30 },
  });

  if (!response.ok) {
    throw new Error(`8004scan error: ${response.status}`);
  }

  const data: ScanAgentsResponse = await response.json();
  const addr = address.toLowerCase();

  return (data.items || []).some(
    (a) =>
      a.owner_address?.toLowerCase() === addr ||
      a.creator_address?.toLowerCase() === addr ||
      a.agent_wallet?.toLowerCase() === addr
  );
}

/**
 * POST /api/vouch
 * Vouch for an unregistered agent. Protected by SIWA ERC-8128 authentication.
 *
 * Requires: X-SIWA-Receipt header + ERC-8128 signed request.
 * Body: { targetAddress: string, category?: string, message: string }
 *
 * If target is already registered, returns a hint to use /api/kudos instead.
 * If target is unregistered, stores a pending vouch.
 */
export const POST = withSiwa(async (agent, req) => {
  const body = await req.json();
  const { targetAddress, message, category: rawCategory } = body;

  // --- Validate targetAddress ---
  if (
    !targetAddress ||
    typeof targetAddress !== 'string' ||
    !isAddress(targetAddress)
  ) {
    return new Response(
      JSON.stringify({
        error: 'Valid Ethereum address required for targetAddress',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // --- Validate message ---
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: 'Non-empty message required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (message.trim().length > 500) {
    return new Response(
      JSON.stringify({ error: 'Message must be 500 characters or fewer' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // --- Prevent self-vouch ---
  if (agent.address.toLowerCase() === targetAddress.toLowerCase()) {
    return new Response(
      JSON.stringify({ error: 'Cannot vouch for yourself' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // --- Rate limit: 5 vouches/hour per agent ---
  const rateLimit = limiter.check(agent.address);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Max 5 vouches per hour.' }),
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

  // --- Check if target is already registered ---
  let targetRegistered: boolean;
  try {
    targetRegistered = await isRegistered(targetAddress);
  } catch {
    return new Response(
      JSON.stringify({ error: 'Failed to query agent registry' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (targetRegistered) {
    return Response.json({
      status: 'registered',
      hint: 'Use /api/kudos directly',
      rateLimit: { remaining: rateLimit.remaining, resetAt: rateLimit.resetAt },
    });
  }

  // --- Resolve category ---
  const category: KudosCategory =
    rawCategory && KUDOS_CATEGORIES.includes(rawCategory)
      ? rawCategory
      : 'reliability';

  // --- Store pending vouch ---
  const result = addVouch(targetAddress, {
    from: agent.address,
    category,
    message: message.trim(),
    timestamp: new Date().toISOString(),
  });

  if (!result.added) {
    return new Response(
      JSON.stringify({
        error: result.reason,
        status: 'limit_reached',
        count: result.count,
      }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return Response.json({
    status: 'pending',
    message: "Vouch recorded. They'll see it when they join.",
    targetAddress,
    category,
    pendingCount: result.count,
    rateLimit: { remaining: rateLimit.remaining, resetAt: rateLimit.resetAt },
  });
});

// CORS preflight for ERC-8128 headers
export { siwaOptions as OPTIONS };
