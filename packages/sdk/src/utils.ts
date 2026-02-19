import { keccak256, toBytes } from 'viem';
import { CONTRACT_ADDRESSES } from './contracts.js';
import {
  KUDOS_TAG1,
  KUDOS_VALUE,
  KUDOS_VALUE_DECIMALS,
  toCAIP10Address,
  AGENT_REGISTRY_CAIP10,
  type KudosCategory,
} from './constants.js';

export interface BuildFeedbackParams {
  agentId: number;
  clientAddress: string;
  category: KudosCategory;
  message: string;
  chainId?: number;
  value?: number;
  tag1?: string;
}

export interface BuildFeedbackResult {
  feedbackURI: string;
  feedbackHash: `0x${string}`;
}

/**
 * Build an ERC-8004 compliant feedback data URI and keccak256 hash.
 * Works in both Node.js and browser environments.
 */
export function buildFeedback(params: BuildFeedbackParams): BuildFeedbackResult {
  const chainId = params.chainId ?? 2741;

  const feedbackFile = {
    agentRegistry: AGENT_REGISTRY_CAIP10(chainId),
    agentId: params.agentId,
    clientAddress: toCAIP10Address(params.clientAddress, chainId),
    createdAt: new Date().toISOString(),
    value: String(params.value ?? KUDOS_VALUE),
    valueDecimals: KUDOS_VALUE_DECIMALS,
    tag1: params.tag1 ?? KUDOS_TAG1,
    tag2: params.category,
    reasoning: params.message.trim(),
  };

  const jsonStr = JSON.stringify(feedbackFile);

  // Platform-agnostic base64 encoding
  const base64 =
    typeof Buffer !== 'undefined'
      ? Buffer.from(jsonStr).toString('base64')
      : btoa(unescape(encodeURIComponent(jsonStr)));

  const feedbackURI = `data:application/json;base64,${base64}`;
  const feedbackHash = keccak256(toBytes(jsonStr));

  return { feedbackURI, feedbackHash };
}

/**
 * Parse a feedback data URI (base64 or plain text) into a JSON object.
 * Returns null if the URI cannot be parsed.
 */
export function parseFeedbackURI(uri: string): Record<string, unknown> | null {
  try {
    if (uri.startsWith('data:application/json;base64,')) {
      const base64 = uri.slice('data:application/json;base64,'.length);
      const jsonStr =
        typeof Buffer !== 'undefined'
          ? Buffer.from(base64, 'base64').toString()
          : decodeURIComponent(escape(atob(base64)));
      return JSON.parse(jsonStr) as Record<string, unknown>;
    }
    if (uri.startsWith('data:,')) {
      const raw = decodeURIComponent(uri.slice(6));
      return JSON.parse(raw) as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Convert an IPFS URI to an HTTP gateway URL.
 * @param uri - IPFS URI (e.g. "ipfs://Qm...")
 * @param gateway - HTTP gateway base URL (default: "https://ipfs.io")
 */
export function ipfsToHttp(
  uri: string,
  gateway = 'https://ipfs.io'
): string {
  if (uri.startsWith('ipfs://')) {
    const path = uri.slice('ipfs://'.length);
    return `${gateway}/ipfs/${path}`;
  }
  return uri;
}
