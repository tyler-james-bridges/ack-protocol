import { NextRequest, NextResponse } from 'next/server';
import { encodeFunctionData, isAddress } from 'viem';
import { REPUTATION_REGISTRY_ABI } from '@/config/abi';
import {
  REPUTATION_REGISTRY_ADDRESS,
  REVIEW_TAG1,
  REVIEW_VALUE_DECIMALS,
  REVIEW_MIN_VALUE,
  REVIEW_MAX_VALUE,
  KUDOS_CATEGORIES,
  type KudosCategory,
} from '@/config/contract';
import { buildFeedback } from '@/lib/feedback';
import { RateLimiter } from '@/lib/rate-limit';

/**
 * POST /api/feedback/agent
 *
 * Agent-to-agent feedback endpoint. Any agent (or human) can leave
 * onchain reputation feedback on another agent. Returns encoded
 * transaction calldata for the caller to sign and broadcast.
 *
 * No authentication required beyond being able to sign the tx.
 * Future: x402 payment gate for spam prevention.
 *
 * Body: {
 *   targetAgentId: number,
 *   value: number (1-5),
 *   category?: string,
 *   reasoning?: string,
 *   callerAddress: string
 * }
 */

const limiter = new RateLimiter({ windowMs: 60 * 60 * 1000, maxRequests: 10 });

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip = clientIp(request);
  const rl = limiter.check(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Max 10 feedback per hour.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { targetAgentId, value, category, reasoning, callerAddress } = body as {
    targetAgentId?: number;
    value?: number;
    category?: string;
    reasoning?: string;
    callerAddress?: string;
  };

  // Validate targetAgentId
  if (
    typeof targetAgentId !== 'number' ||
    !Number.isInteger(targetAgentId) ||
    targetAgentId < 0
  ) {
    return NextResponse.json(
      { error: 'targetAgentId must be a non-negative integer' },
      { status: 400 }
    );
  }

  // Validate value (1-5 scale)
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < REVIEW_MIN_VALUE ||
    value > REVIEW_MAX_VALUE
  ) {
    return NextResponse.json(
      {
        error: `value must be an integer between ${REVIEW_MIN_VALUE} and ${REVIEW_MAX_VALUE}`,
      },
      { status: 400 }
    );
  }

  // Validate callerAddress
  if (typeof callerAddress !== 'string' || !isAddress(callerAddress)) {
    return NextResponse.json(
      { error: 'callerAddress must be a valid Ethereum address' },
      { status: 400 }
    );
  }

  // Validate optional category
  const resolvedCategory: KudosCategory | '' =
    typeof category === 'string' &&
    KUDOS_CATEGORIES.includes(category as KudosCategory)
      ? (category as KudosCategory)
      : '';

  // Validate optional reasoning
  const resolvedReasoning =
    typeof reasoning === 'string' ? reasoning.trim().slice(0, 512) : '';

  // Build feedback file
  const { feedbackURI, feedbackHash } = buildFeedback({
    agentId: targetAgentId,
    clientAddress: callerAddress,
    category: resolvedCategory,
    message: resolvedReasoning,
    value,
    tag1: REVIEW_TAG1,
    valueDecimals: REVIEW_VALUE_DECIMALS,
  });

  // Encode giveFeedback transaction
  const txData = encodeFunctionData({
    abi: REPUTATION_REGISTRY_ABI,
    functionName: 'giveFeedback',
    args: [
      BigInt(targetAgentId),
      BigInt(value),
      REVIEW_VALUE_DECIMALS,
      REVIEW_TAG1,
      resolvedCategory,
      '',
      feedbackURI,
      feedbackHash,
    ],
  });

  return NextResponse.json(
    {
      success: true,
      targetAgentId,
      value,
      category: resolvedCategory || null,
      transaction: {
        to: REPUTATION_REGISTRY_ADDRESS,
        data: txData,
        chainId: 2741,
        value: '0',
      },
      feedbackURI,
      feedbackHash,
      rateLimit: {
        remaining: rl.remaining,
        resetAt: rl.resetAt,
      },
    },
    {
      headers: {
        'X-RateLimit-Remaining': String(rl.remaining),
      },
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Agent-Id',
    },
  });
}
