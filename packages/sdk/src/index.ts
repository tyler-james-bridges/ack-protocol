/**
 * ACK Protocol SDK - Lightweight TypeScript SDK for reputation system
 *
 * @example
 * ```ts
 * import { ACK } from '@ack-onchain/sdk'
 *
 * // Read-only client
 * const ack = ACK.readonly({ chain: 'abstract' })
 * const agent = await ack.getAgent(606)
 * const rep = await ack.reputation(606)
 *
 * // Write client
 * const ack = ACK.fromPrivateKey('0x...', { chain: 'abstract' })
 * const tx = await ack.kudos(606, { category: 'reliability', score: 5 })
 * ```
 */

export { ACK } from './client.js';
export { getChainConfig, getSupportedChains, CHAIN_CONFIGS } from './chains.js';
export { CONTRACT_ADDRESSES } from './contracts.js';

// Constants
export {
  KUDOS_VALUE,
  KUDOS_VALUE_DECIMALS,
  KUDOS_TAG1,
  REVIEW_TAG1,
  REVIEW_MIN_VALUE,
  REVIEW_MAX_VALUE,
  REVIEW_VALUE_DECIMALS,
  KUDOS_CATEGORIES,
  CATEGORY_META,
  AGENT_REGISTRY_CAIP10,
  toCAIP10Address,
  DEPLOYMENT_BLOCKS,
  EVENT_TOPICS,
} from './constants.js';

export type { KudosCategory } from './constants.js';

// Utilities
export { buildFeedback, parseFeedbackURI, ipfsToHttp } from './utils.js';
export type { BuildFeedbackParams, BuildFeedbackResult } from './utils.js';

// Types
export type {
  ChainId,
  ChainConfig,
  ACKConfig,
  Agent,
  Reputation,
  ReputationCategory,
  Feedback,
  FeedbackCategory,
  RegisterParams,
  KudosParams,
  LeaderboardParams,
  TransactionResult,
} from './types.js';
