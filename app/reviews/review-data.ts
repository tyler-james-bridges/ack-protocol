/**
 * ACK Review data — sourced from on-chain ERC-8004 feedback transactions.
 * This file is generated from ack-feedback-tracker.json.
 */

export interface ChainReviewStats {
  id: number;
  name: string;
  color: string;
  count: number;
  uniqueAgents: number;
}

export interface DailyReview {
  date: string;
  chains: Record<string, number>;
}

export interface ReviewData {
  total: number;
  chains: ChainReviewStats[];
  byDate: DailyReview[];
  firstDate: string;
  lastDate: string;
}

export const CHAIN_META: Record<
  number,
  { name: string; color: string; explorer: string }
> = {
  1: {
    name: 'Ethereum',
    color: '#627EEA',
    explorer: 'https://etherscan.io/tx',
  },
  2741: {
    name: 'Abstract',
    color: '#00D4AA',
    explorer: 'https://abscan.org/tx',
  },
  8453: { name: 'Base', color: '#0052FF', explorer: 'https://basescan.org/tx' },
  42220: {
    name: 'Celo',
    color: '#FCFF52',
    explorer: 'https://celoscan.io/tx',
  },
};

// Inline data extracted from ack-feedback-tracker.json
// To regenerate: node scripts/extract-review-data.mjs
import generatedData from './review-data.json';

export function getReviewData(): ReviewData {
  return generatedData as ReviewData;
}
