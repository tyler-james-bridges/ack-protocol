import { NextResponse } from 'next/server';
import { getAgentRegistryCAIP10 } from '@/config/contract';

const category = 'infrastructure,reputation,interoperability,developer-tools';
const solanaMainnet = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const solanaProgram = '8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ';

type RegisteredAgent =
  | { chain: number; agentId: number }
  | { chain: typeof solanaMainnet; agentId: number; asset: string };

const agents: RegisteredAgent[] = [
  { chain: 2741, agentId: 606 },
  { chain: 1, agentId: 26424 },
  { chain: 8453, agentId: 19125 },
  { chain: 4217, agentId: 0 },
  { chain: 4663, agentId: 8619 },
  { chain: 4663, agentId: 8620 },
  {
    chain: solanaMainnet,
    agentId: 0,
    asset: 'fx6DUWG1cfvvwaDgWhfQHydsbdYVbgg1aJuYDskmTv9',
  },
];

function registration(agent: RegisteredAgent) {
  if (agent.chain === solanaMainnet) {
    return {
      agentId: agent.agentId,
      asset: agent.asset,
      agentRegistry: `${agent.chain}:${solanaProgram}`,
    };
  }
  return {
    agentId: agent.agentId,
    agentRegistry: getAgentRegistryCAIP10(agent.chain),
  };
}

export function GET() {
  return NextResponse.json({
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: 'ACK',
    description:
      'ACK (Agent Consensus Kudos) is a peer-driven reputation layer for AI agents. Built on ERC-8004, ACK surfaces trust through consensus.',
    image: 'https://ack-onchain.dev/icon-512.png',
    agentType: 'reputation',
    category,
    categories: [category],
    services: [
      {
        name: 'web',
        endpoint: 'https://ack-onchain.dev',
      },
      {
        name: 'A2A',
        endpoint: 'https://ack-onchain.dev/.well-known/agent-card.json',
        version: '0.3.0',
      },
      {
        name: 'MCP',
        endpoint: 'https://ack-onchain.dev/api/mcp',
        version: '2025-06-18',
      },
      {
        name: 'OASF',
        endpoint: 'https://ack-onchain.dev/.well-known/oasf.json',
        version: '0.8.0',
        skills: [
          'retrieval_augmented_generation',
          'natural_language_processing',
          'tool_interaction',
          'analytical_skills',
          'evaluation_monitoring',
        ],
        domains: [
          'technology',
          'finance_and_business',
          'trust_and_safety',
          'research_and_development',
        ],
      },
      {
        name: 'Email',
        endpoint: 'onchaindevex@gmail.com',
      },
      {
        name: 'ENS',
        endpoint: 'ack-onchain.eth',
        version: 'v1',
      },
      {
        name: 'wallet',
        endpoint: '0x668aDd9213985E7Fd613Aec87767C892f4b9dF1c',
      },
    ],
    active: true,
    x402Support: true,
    tags: [
      'reputation',
      'kudos',
      'erc-8004',
      'trust',
      'peer-review',
      'onchain',
      'abstract',
      'ai-agents',
      'x402',
      'tipping',
    ],

    registrations: agents.map(registration),
    supportedTrust: ['reputation', 'crypto-economic', 'tee-attestation'],
  });
}
