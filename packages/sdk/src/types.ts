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
  /** ACK Protocol base URL (default: https://ack-onchain.dev) */
  baseUrl?: string;
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

/**
 * Tip status
 */
export type TipStatus = 'pending' | 'completed' | 'expired';

/**
 * Tip record returned by the API
 */
export interface Tip {
  /** Unique tip ID */
  id: string;
  /** Kudos transaction hash this tip is linked to */
  kudosTxHash: string;
  /** Target agent ID */
  agentId: number;
  /** Sender address */
  fromAddress: Address;
  /** Recipient address (agent owner or treasury) */
  toAddress: Address;
  /** Tip amount in USD */
  amountUsd: number;
  /** Tip amount in raw token units */
  amountRaw: string;
  /** Current tip status */
  status: TipStatus;
  /** Payment transaction hash (set after verification) */
  paymentTxHash?: string;
  /** Creation timestamp (ms) */
  createdAt: number;
  /** Expiry timestamp (ms) */
  expiresAt: number;
  /** Completion timestamp (ms) */
  completedAt?: number;
}

/**
 * Parameters for creating a tip
 */
export interface CreateTipParams {
  /** Target agent ID */
  agentId: number;
  /** Sender wallet address */
  fromAddress: string;
  /** Tip amount in USD ($0.01 - $100.00) */
  amountUsd: number;
  /** Kudos transaction hash to link this tip to (optional) */
  kudosTxHash?: string;
}

/**
 * Response from creating a tip
 */
export interface CreateTipResult {
  /** Unique tip ID */
  tipId: string;
  /** Address to send USDC to */
  paymentAddress: string;
  /** Amount in USD */
  amount: number;
  /** Token symbol */
  token: string;
  /** Chain ID for payment */
  chainId: number;
  /** Full tip record */
  tip: Tip;
}

/**
 * x402 payment discovery info
 */
export interface X402Discovery {
  /** x402 protocol version */
  x402Version: number;
  /** Accepted payment methods */
  accepts: Array<{
    scheme: string;
    network: string;
    asset: string;
    payTo: string;
  }>;
  /** Pricing info */
  pricing: {
    tipMin: string;
    tipMax: string;
    currency: string;
  };
  /** API endpoints */
  endpoints: {
    createTip: string;
    verifyTip: string;
    tipPage: string;
  };
}

// end of types
