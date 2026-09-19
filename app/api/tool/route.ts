/**
 * Unified ERC-8257 tool endpoint.
 *
 * POST { action, ...params } dispatches to a registered handler.
 * Reputation actions are registered by importing `@/lib/tools/reputation`.
 * A later tool (kudos) adds `import '@/lib/tools/kudos'` — no rewrite.
 */

import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter } from '@/lib/rate-limit';
import { getToolBaseUrl } from '@/lib/tool-manifest';
import { dispatchToolRequest, toolDiscoveryPayload } from '@/lib/tool-dispatch';
import '@/lib/tools/reputation';

const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 60 });

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Payment, X-Agent-Id',
  'X-API-Version': '1',
};

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function json(body: unknown, status: number, extra?: HeadersInit) {
  return NextResponse.json(body, {
    status,
    headers: {
      ...CORS_HEADERS,
      ...extra,
    },
  });
}

export async function GET() {
  return json(toolDiscoveryPayload(getToolBaseUrl()), 200, {
    'Cache-Control': 'public, max-age=60',
  });
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  const rl = limiter.check(ip);
  if (!rl.allowed) {
    return json(
      { error: 'Rate limit exceeded. Max 60 requests per minute.' },
      429,
      {
        'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(rl.resetAt / 1000)),
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400, {
      'X-RateLimit-Remaining': String(rl.remaining),
    });
  }

  try {
    const result = await dispatchToolRequest(body);
    return json(result.body, result.status, {
      'X-RateLimit-Remaining': String(rl.remaining),
    });
  } catch (error) {
    return json(
      {
        error: `Tool action failed: ${error instanceof Error ? error.message : String(error)}`,
      },
      502,
      {
        'X-RateLimit-Remaining': String(rl.remaining),
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
