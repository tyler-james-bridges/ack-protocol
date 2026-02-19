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
