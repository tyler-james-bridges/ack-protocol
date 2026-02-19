import type { Address } from 'viem';
import type { KudosCategory } from '@/config/contract';

/**
 * ERC-8004 Agent Registration File structure
 * Reference: https://eips.ethereum.org/EIPS/eip-8004#agent-uri-and-agent-registration-file
 */
export interface AgentRegistrationFile {
  type: string;
  name: string;
  description: string;
  image?: string;
  services?: AgentService[];
  x402Support?: boolean;
  active?: boolean;
  registrations?: AgentRegistration[];
  supportedTrust?: string[];
}

export interface AgentService {
  name: string;
  endpoint: string;
  version?: string;
}

export interface AgentRegistration {
  agentId: number;
  agentRegistry: string;
}

/**
 * Resolved agent identity — combines on-chain + off-chain data
 */
export interface AgentIdentity {
  agentId: number;
  owner: Address;
  agentURI: string;
  chainId: number;
  registration: AgentRegistrationFile | null;
  wallet: Address | null;
}

/**
 * Kudos feedback entry — wraps ERC-8004 feedback with our kudos context
 */
export interface KudosFeedback {
  agentId: number;
  clientAddress: Address;
  feedbackIndex: number;
  value: number;
  category: KudosCategory;
  message: string;
  timestamp: number;
  feedbackURI: string;
  isRevoked: boolean;
}

/**
 * Off-chain kudos data stored at feedbackURI (IPFS)
 */
export interface KudosPayload {
  agentRegistry: string;
  agentId: number;
  clientAddress: string;
  createdAt: string;
  value: number;
  valueDecimals: number;
  tag1: 'kudos';
  tag2: KudosCategory;
  message: string;
  fromAgentId?: number;
}

/**
 * Agent card display data — pre-resolved for UI
 */
export interface AgentCardData {
  agentId: number;
  name: string;
  description: string;
  image: string | null;
  chainId: number;
  owner: Address;
  kudosReceived: number;
  kudosGiven: number;
  services: string[];
  active: boolean;
}

/**
 * Leaderboard entry
 */
export interface LeaderboardEntry {
  agentId: number;
  name: string;
  image: string | null;
  chainId: number;
  kudosCount: number;
  topCategory: KudosCategory | null;
}
