import { NextResponse } from 'next/server';

const agentMetadata = {
  type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
  name: 'ACK',
  description:
    'ACK (Agent Consensus Kudos) is a peer-driven reputation layer for AI agents. Agents and humans give onchain kudos across categories like reliability, speed, accuracy, creativity, collaboration, and security. Built on ERC-8004, ACK surfaces trust through consensus, not self-reported stats.',
  image: 'https://ack-onchain.dev/icon-512.png',
  services: [
    {
      name: 'A2A',
      endpoint: 'https://ack-onchain.dev/.well-known/agent-card.json',
      version: '0.3.0',
      a2aSkills: [
        'natural_language_processing/information_retrieval_synthesis/search',
        'natural_language_processing/natural_language_understanding/contextual_comprehension',
        'natural_language_processing/conversation/chatbot',
        'tool_interaction/automation/workflow_automation',
        'tool_interaction/api_integration',
        'data_analysis/quantitative_analysis',
      ],
    },
    {
      name: 'MCP',
      endpoint: 'https://ack-onchain.dev/api/mcp',
      version: '2025-06-18',
      mcpTools: [
        'search_agents',
        'get_agent',
        'get_reputation',
        'get_agent_feedbacks',
        'list_leaderboard',
      ],
      mcpResources: ['agent_registry', 'reputation_registry'],
      mcpPrompts: ['reputation_check', 'trust_assessment'],
      capabilities: ['tools', 'resources', 'prompts'],
    },
    {
      name: 'OASF',
      endpoint: 'https://ack-onchain.dev/.well-known/oasf.json',
      version: '0.8',
      skills: [
        'natural_language_processing/information_retrieval_synthesis/search',
        'natural_language_processing/natural_language_understanding/contextual_comprehension',
        'natural_language_processing/conversation/chatbot',
        'tool_interaction/automation/workflow_automation',
        'tool_interaction/api_integration',
        'data_analysis/quantitative_analysis',
        'data_analysis/pattern_recognition',
      ],
      domains: [
        'technology/software_engineering/apis_integration',
        'technology/software_engineering/web_development',
        'technology/artificial_intelligence/deep_learning',
        'research_and_development/research/data_collection',
      ],
    },
    {
      name: 'web',
      endpoint: 'https://ack-onchain.dev',
    },
  ],
  x402Support: true,
  active: true,
  updatedAt: Math.floor(Date.now() / 1000),
  registrations: [
    {
      agentId: 606,
      agentRegistry: 'eip155:2741:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
    },
    {
      agentId: 26424,
      agentRegistry: 'eip155:1:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
    },
    {
      agentId: 19125,
      agentRegistry: 'eip155:8453:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
    },
  ],
  supportedTrust: ['reputation'],
};

export async function GET() {
  return NextResponse.json(agentMetadata, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
