/**
 * Shared type definitions for the Kudos application
 */

/**
 * Represents a kudos entry in the system
 */
export interface KudosEntry {
  id: string;
  fromHandle: string;
  toHandle: string;
  tweetUrl: string;
  timestamp: number;
  message?: string;
}

/**
 * Represents a user profile with kudos statistics
 */
export interface UserProfile {
  handle: string;
  kudosReceived: number;
  kudosGiven: number;
  walletAddress?: string;
}

/**
 * Represents a simulated tweet for testing purposes
 */
export interface SimulatedTweet {
  id: string;
  text: string;
  author: string;
  timestamp: Date;
  processed: boolean;
}

/**
 * Represents a found tweet from search results
 */
export interface FoundTweet {
  id: string;
  authorUsername: string;
  text: string;
  url: string;
}

/**
 * Error type for contract interactions with optional reason field
 */
export interface ContractError extends Error {
  reason?: string;
}
