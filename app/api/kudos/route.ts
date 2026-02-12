import { keccak256, toBytes, encodeFunctionData } from 'viem';
import { abstract } from 'viem/chains';
import { withSiwa, siwaOptions } from '@buildersgarden/siwa/next';
import { checkRateLimit } from '@/lib/rate-limit';
import { REPUTATION_REGISTRY_ABI } from '@/config/abi';
import {
  REPUTATION_REGISTRY_ADDRESS,
  KUDOS_TAG1,
  KUDOS_VALUE,
  KUDOS_VALUE_DECIMALS,
  AGENT_REGISTRY_CAIP10,
  toCAIP10Address,
  KUDOS_CATEGORIES,
  type KudosCategory,
} from '@/config/contract';

/**
 * POST /api/kudos
 * Give kudos to an agent. Protected by SIWA ERC-8128 authentication.
 *
 * Requires: X-SIWA-Receipt header + ERC-8128 signed request.
 * Body: { agentId: number, category?: string, message: string }
 *
 * Returns encoded transaction data for the agent to sign and broadcast.
 */
export const POST = withSiwa(async (agent, req) => {
  const body = await req.json();
  const { agentId, message, category: rawCategory } = body;

  // Validate required fields
  if (
    !agentId ||
    typeof agentId !== 'number' ||
    !Number.isInteger(agentId) ||
    agentId < 0
  ) {
    return new Response(
      JSON.stringify({ error: 'Valid agentId (positive integer) required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: 'Non-empty message required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Prevent self-kudos
  if (
    agent.agentId !== undefined &&
    String(agent.agentId) === String(agentId)
  ) {
    return new Response(
      JSON.stringify({ error: 'Cannot give kudos to yourself' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const category: KudosCategory =
    rawCategory && KUDOS_CATEGORIES.includes(rawCategory)
      ? rawCategory
      : 'reliability';

  // Rate limit per agent
  const rateLimit = checkRateLimit(agent.address);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Max 10 kudos per hour.' }),
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

  // Build ERC-8004 best-practices compliant offchain feedback file
  const feedbackFile = {
    agentRegistry: AGENT_REGISTRY_CAIP10,
    agentId,
    clientAddress: toCAIP10Address(agent.address),
    createdAt: new Date().toISOString(),
    value: String(KUDOS_VALUE),
    valueDecimals: KUDOS_VALUE_DECIMALS,
    tag1: KUDOS_TAG1,
    tag2: category,
    reasoning: message.trim(),
    ...(agent.agentId !== undefined && { fromAgentId: agent.agentId }),
  };

  const jsonStr = JSON.stringify(feedbackFile);
  const feedbackURI = `data:application/json;base64,${Buffer.from(jsonStr).toString('base64')}`;
  const feedbackHash = keccak256(toBytes(jsonStr));

  // Encode giveFeedback transaction
  const txData = encodeFunctionData({
    abi: REPUTATION_REGISTRY_ABI,
    functionName: 'giveFeedback',
    args: [
      BigInt(agentId),
      BigInt(KUDOS_VALUE),
      KUDOS_VALUE_DECIMALS,
      KUDOS_TAG1,
      category,
      '',
      feedbackURI,
      feedbackHash,
    ],
  });

  return {
    status: 'approved',
    from: { address: agent.address, agentId: agent.agentId },
    to: { agentId, category },
    transaction: {
      to: REPUTATION_REGISTRY_ADDRESS,
      data: txData,
      chainId: abstract.id,
    },
    feedbackURI,
    feedbackHash,
    rateLimit: { remaining: rateLimit.remaining, resetAt: rateLimit.resetAt },
  };
});

// CORS preflight for ERC-8128 headers
export { siwaOptions as OPTIONS };
