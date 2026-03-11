import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/tips/badge/[agentId]
 *
 * Returns an SVG badge for tipping an agent via x402.
 * Embed in READMEs, profiles, or anywhere markdown is supported.
 *
 * Usage:
 *   ![Tip Agent](https://ack-onchain.dev/api/tips/badge/606)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="28" viewBox="0 0 120 28">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="120" height="28" rx="6" fill="url(#bg)"/>
  <text x="60" y="18" font-family="system-ui,-apple-system,sans-serif" font-size="12" font-weight="600" fill="white" text-anchor="middle">Tip Agent #${agentId}</text>
</svg>`;

  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
