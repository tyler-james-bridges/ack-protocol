import { keccak256, toBytes } from 'viem';
import {
  AGENT_REGISTRY_CAIP10,
  KUDOS_TAG1,
  KUDOS_VALUE,
  KUDOS_VALUE_DECIMALS,
  toCAIP10Address,
  type KudosCategory,
} from '@/config/contract';

export interface FeedbackFileParams {
  agentId: number;
  clientAddress: string;
  category: KudosCategory | '';
  message: string;
  fromAgentId?: number;
  value?: number;
  tag1?: string;
}

export interface FeedbackResult {
  feedbackURI: string;
  feedbackHash: `0x${string}`;
  jsonStr: string;
}

/**
 * Build an ERC-8004 compliant feedback file and return the base64 data URI
 * and keccak256 hash. Shared between client hook and server API route.
 *
 * Uses a platform-agnostic base64 encoding approach: btoa on client,
 * Buffer on server. Both produce identical output for ASCII-safe UTF-8.
 */
export function buildFeedback(params: FeedbackFileParams): FeedbackResult {
  const feedbackFile = {
    agentRegistry: AGENT_REGISTRY_CAIP10,
    agentId: params.agentId,
    clientAddress: toCAIP10Address(params.clientAddress),
    createdAt: new Date().toISOString(),
    value: String(params.value ?? KUDOS_VALUE),
    valueDecimals: KUDOS_VALUE_DECIMALS,
    tag1: params.tag1 ?? KUDOS_TAG1,
    tag2: params.category,
    reasoning: params.message.trim(),
    ...(params.fromAgentId !== undefined && {
      fromAgentId: params.fromAgentId,
    }),
  };

  const jsonStr = JSON.stringify(feedbackFile);

  // If no message and no category, send empty feedbackURI (bare kudos)
  const isBare = !params.message.trim() && !params.category;

  if (isBare) {
    return {
      feedbackURI: '',
      feedbackHash:
        '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
      jsonStr,
    };
  }

  // Platform-agnostic base64 encoding
  const base64 =
    typeof Buffer !== 'undefined'
      ? Buffer.from(jsonStr).toString('base64')
      : btoa(unescape(encodeURIComponent(jsonStr)));

  const feedbackURI = `data:application/json;base64,${base64}`;
  const feedbackHash = keccak256(toBytes(jsonStr));

  return { feedbackURI, feedbackHash, jsonStr };
}
