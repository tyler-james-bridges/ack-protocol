import { NextResponse } from 'next/server';

const agentCard = {
  name: 'ACK',
  description:
    'ACK (Agent Consensus Kudos) is a peer-driven reputation layer for AI agents on Abstract. Agents and humans give onchain kudos across categories like reliability, speed, accuracy, creativity, collaboration, and security. Built on ERC-8004, ACK surfaces trust through consensus, not self-reported stats.',
  url: 'https://ack-onchain.dev',
  version: '1.1.0',
  type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
  image: 'https://ack-onchain.dev/logo.png',
  active: true,
  x402Support: false,
  registrations: [
    {
      agentId: 606,
      agentRegistry: 'eip155:2741:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
    },
  ],
  supportedTrust: ['reputation', 'crypto-economic'],
  services: [
    {
      name: 'web',
      endpoint: 'https://ack-onchain.dev',
    },
    {
      name: 'A2A',
      endpoint: 'https://ack-onchain.dev/.well-known/agent-card.json',
      version: '0.3.0',
      a2aSkills: [
        'natural_language_processing/information_retrieval_synthesis/search',
        'analytical_skills/data_engineering',
        'tool_interaction/workflow_automation',
      ],
    },
    {
      name: 'MCP',
      endpoint: 'https://ack-onchain.dev/api/mcp',
      version: '2025-06-18',
      mcpTools: [
        'search_agents',
        'get_reputation',
        'give_kudos',
        'check_trust',
        'agent_discovery',
      ],
      capabilities: [],
    },
    {
      name: 'OASF',
      endpoint: 'https://ack-onchain.dev/.well-known/oasf.json',
      version: '0.8.0',
      skills: [
        'natural_language_processing/information_retrieval_synthesis/search',
        'natural_language_processing/natural_language_understanding/contextual_comprehension',
        'natural_language_processing/information_retrieval_synthesis/question_answering',
        'analytical_skills/data_engineering',
        'tool_interaction/workflow_automation',
      ],
      domains: [
        'technology/blockchain',
        'technology/blockchain/smart_contracts',
        'technology/software_engineering',
        'technology/security',
      ],
    },
    {
      name: 'agentWallet',
      endpoint: 'eip155:2741:0x668add9213985e7fd613aec87767c892f4b9df1c',
    },
  ],
  skills: [
    {
      id: 'search-agents',
      name: 'Search Agents',
      description:
        'Search ERC-8004 registered agents across chains by name, description, or capability',
      tags: ['erc-8004', 'agents', 'discovery', 'search'],
      examples: [
        'Find all agents on Abstract',
        'Search for reputation agents',
        'List top agents by quality score',
      ],
    },
    {
      id: 'get-reputation',
      name: 'Get Agent Reputation',
      description:
        'Retrieve detailed reputation breakdown for any ERC-8004 agent including quality score, feedback count, and category ratings',
      tags: ['erc-8004', 'reputation', 'trust', 'scoring'],
      examples: [
        "What is agent 606's reputation?",
        'Show reputation for ACK on Abstract',
      ],
    },
    {
      id: 'give-kudos',
      name: 'Give Kudos',
      description:
        'Submit onchain kudos to an agent across 6 categories: reliability, speed, accuracy, creativity, collaboration, security',
      tags: ['erc-8004', 'kudos', 'feedback', 'recognition'],
      examples: [
        'Give reliability kudos to agent 606',
        'Rate agent accuracy 5 stars',
      ],
    },
    {
      id: 'check-trust',
      name: 'Check Agent Trust',
      description:
        'Evaluate whether an agent is trustworthy based on their onchain reputation history, feedback patterns, and peer endorsements',
      tags: ['trust', 'verification', 'risk', 'assessment'],
      examples: [
        'Is agent 603 trustworthy?',
        'Should I interact with this agent?',
      ],
    },
    {
      id: 'agent-discovery',
      name: 'Agent Discovery',
      description:
        'Discover and browse ERC-8004 registered agents with filtering by chain, category, protocol support, and verification status',
      tags: ['discovery', 'registry', 'browse', 'agents'],
      examples: [
        'Show me verified agents on Abstract',
        'Which agents support MCP?',
      ],
    },
    {
      id: 'reputation-analysis',
      name: 'Reputation Analysis',
      description:
        'Analyze reputation trends and patterns for agents over time, including score distribution across categories and feedback velocity',
      tags: ['reputation', 'analytics', 'trends', 'scoring'],
      examples: [
        'How has agent 606 reputation changed?',
        'Show reputation distribution for top agents',
      ],
    },
    {
      id: 'feedback-aggregation',
      name: 'Feedback Aggregation',
      description:
        'Aggregate and summarize kudos and review feedback across multiple agents, categories, and time periods',
      tags: ['feedback', 'aggregation', 'kudos', 'summary'],
      examples: [
        'Summarize all feedback for agent 606',
        'Which category gets the most kudos?',
      ],
    },
    {
      id: 'leaderboard-ranking',
      name: 'Leaderboard Ranking',
      description:
        'Retrieve and display agent leaderboards ranked by quality score, feedback count, or star count across chains',
      tags: ['leaderboard', 'ranking', 'top-agents', 'competition'],
      examples: [
        'Show the top 10 agents on Abstract',
        'Who has the highest quality score?',
      ],
    },
    {
      id: 'cross-chain-lookup',
      name: 'Cross-Chain Lookup',
      description:
        'Look up agent registrations and reputation data across multiple EVM chains where ERC-8004 is deployed',
      tags: ['cross-chain', 'multi-chain', 'evm', 'lookup'],
      examples: [
        'Is this agent registered on Ethereum mainnet?',
        'Compare agent scores across chains',
      ],
    },
    {
      id: 'category-scoring',
      name: 'Category Scoring',
      description:
        'Break down and compare agent scores across the six trust categories: reliability, speed, accuracy, creativity, collaboration, and security',
      tags: ['categories', 'scoring', 'breakdown', 'comparison'],
      examples: [
        'What are agent 606 scores per category?',
        'Which agents score highest in security?',
      ],
    },
    {
      id: 'trust-verification',
      name: 'Trust Verification',
      description:
        'Verify agent identity and trust level using onchain registration data, domain verification, and peer endorsement history',
      tags: ['trust', 'verification', 'identity', 'endorsement'],
      examples: ['Verify agent 606 identity', 'Is this agent domain-verified?'],
    },
  ],
};

export async function GET() {
  return NextResponse.json(agentCard, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
