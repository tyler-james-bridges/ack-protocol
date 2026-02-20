import type { Address, Hash } from 'viem';

/**
 * Supported chain identifiers
 */
export type ChainId =
  | 'abstract'
  | 'base'
  | 'ethereum'
  | 'bnb'
  | 'celo'
  | 'gnosis'
  | 'arbitrum'
  | 'optimism'
  | 'polygon'
  | 'scroll'
  | 'avalanche'
  | 'linea'
  | 'taiko'
  | 'xlayer';

/**
 * Chain configuration
 */
export interface ChainConfig {
  /** Chain ID number */
  id: number;
  /** Chain name */
  name: string;
  /** RPC URL for the chain */
  rpcUrl: string;
}

/**
 * SDK configuration options
 */
export interface ACKConfig {
  /** Target blockchain */
  chain: ChainId;
  /** API key for 8004scan (optional) */
  apiKey?: string;
  /** Custom RPC URL (overrides default) */
  rpcUrl?: string;
}

/**
 * Agent information
 */
export interface Agent {
  /** Unique agent ID */
  id: number;
  /** Agent name */
  name: string;
  /** Agent description */
  description: string;
  /** Owner address */
  owner: Address;
  /** Token URI for metadata */
  tokenURI?: string;
  /** Registration timestamp */
  registeredAt?: number;
}

/**
 * Reputation data
 */
export interface Reputation {
  /** Agent ID */
  agentId: number;
  /** Overall quality score */
  qualityScore: number;
  /** Total feedback count */
  totalFeedbacks: number;
  /** Average rating */
  averageRating: number;
  /** Reputation breakdown by category */
  categories: ReputationCategory[];
}

/**
 * Reputation category breakdown
 */
export interface ReputationCategory {
  /** Category name */
  category: FeedbackCategory;
  /** Average score for this category */
  averageScore: number;
  /** Number of feedbacks in this category */
  count: number;
}

/**
 * Feedback entry
 */
export interface Feedback {
  /** Feedback ID */
  id: string;
  /** Target agent ID */
  agentId: number;
  /** Feedback giver address */
  from: Address;
  /** Feedback category */
  category: FeedbackCategory;
  /** Score (1-5) */
  score: number;
  /** Optional message */
  message?: string;
  /** Timestamp when feedback was given */
  timestamp: number;
  /** Transaction hash */
  transactionHash: Hash;
}

/**
 * Valid feedback categories
 */
export type FeedbackCategory =
  | 'reliability'
  | 'speed'
  | 'accuracy'
  | 'creativity'
  | 'collaboration'
  | 'security';

/**
 * Registration parameters
 */
export interface RegisterParams {
  /** Agent name */
  name: string;
  /** Agent description */
  description: string;
  /** Optional metadata URI */
  metadataURI?: string;
}

/**
 * Kudos/feedback parameters
 */
export interface KudosParams {
  /** Feedback category (optional, omit for bare kudos) */
  category?: FeedbackCategory | '';
  /** Optional message explaining the kudos */
  message?: string;
  /** If giving kudos as an agent, your agent token ID */
  fromAgentId?: number;
  /** Set true to submit as a review instead of kudos */
  isReview?: boolean;
  /** Review value from -5 to 5 (default: 5 for kudos) */
  value?: number;
}

/**
 * Leaderboard parameters
 */
export interface LeaderboardParams {
  /** Sort criteria */
  sortBy?: 'quality_score' | 'total_feedbacks' | 'average_rating';
  /** Maximum results to return */
  limit?: number;
  /** Result offset for pagination */
  offset?: number;
  /** Filter by category */
  category?: FeedbackCategory;
}

/**
 * Transaction response
 */
export interface TransactionResult {
  /** Transaction hash */
  hash: Hash;
  /** Block number (if confirmed) */
  blockNumber?: bigint;
  /** Gas used */
  gasUsed?: bigint;
}

// end of types
