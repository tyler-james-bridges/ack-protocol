/**
 * ERC-8257 Assembly intelligence tool handler.
 *
 * Separate from POST /api/tool (reputation) so action names stay namespaced
 * and x402 $0.02 pricing is enforced on this surface only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withPayment } from '@/lib/x402';
import {
  ASSEMBLY_ACTIONS,
  ASSEMBLY_TOOL_NAME,
  ASSEMBLY_TOOL_PRICE_USDC,
} from '@/lib/tools/assembly-manifest';
import { handleAssemblyTool } from '@/lib/tools/assembly-handler';
import { getToolBaseUrl } from '@/lib/tool-manifest';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Payment, X-Agent-Id',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  const baseUrl = getToolBaseUrl();
  return NextResponse.json(
    {
      name: ASSEMBLY_TOOL_NAME,
      description:
        'AI Assembly governance intelligence. POST an action after x402 payment.',
      endpoint: `${baseUrl}/api/tool/assembly`,
      actions: [...ASSEMBLY_ACTIONS],
      manifest: `${baseUrl}/.well-known/ai-tool/ack-assembly.json`,
      pricingUsdc: ASSEMBLY_TOOL_PRICE_USDC,
    },
    {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Cache-Control': 'public, max-age=60',
      },
    }
  );
}

async function handler(req: NextRequest): Promise<NextResponse> {
  const body = await req.json().catch(() => null);
  const result = await handleAssemblyTool(body);
  return NextResponse.json(result.body, {
    status: result.status,
    headers: CORS_HEADERS,
  });
}

export const POST = withPayment(
  handler,
  ASSEMBLY_TOOL_PRICE_USDC,
  'ACK Assembly governance lookup'
);
