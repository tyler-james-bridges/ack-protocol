import { isAddress } from 'viem';
import { getVouches } from '@/lib/vouch-store';

/**
 * GET /api/vouch/:address
 * Public endpoint — returns all pending vouches for an address.
 *
 * No authentication required. This is the lookup that the onboard flow
 * and landing page use to show "You have N vouches waiting!"
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  if (!address || !isAddress(address)) {
    return new Response(
      JSON.stringify({ error: 'Valid Ethereum address required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { vouches, count } = getVouches(address);

  return Response.json({ address: address.toLowerCase(), vouches, count });
}
