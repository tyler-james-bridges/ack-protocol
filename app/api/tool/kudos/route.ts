/**
 * ERC-8257 kudos & tips tool handler.
 *
 * Separate from /api/tool so the parallel reputation tool (#36) can own
 * that route without colliding.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withPayment } from '@/lib/x402';
import { ACK_KUDOS_PRICE_USDC } from '@/lib/tools/kudos-manifest';
import { handleKudosTool } from '@/lib/tools/kudos-handler';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Payment, PAYMENT-SIGNATURE',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

async function handler(req: NextRequest): Promise<NextResponse> {
  const body = await req.json().catch(() => null);
  const result = await handleKudosTool(body);
  return NextResponse.json(result.body, {
    status: result.status,
    headers: corsHeaders,
  });
}

export const POST = withPayment(
  handler,
  ACK_KUDOS_PRICE_USDC,
  'ACK kudos and tipping lookup'
);
