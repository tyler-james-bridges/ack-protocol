import { NextResponse } from 'next/server';

/**
 * OASF (Open Agentic Schema Framework) endpoint
 * Returns standardized skills and domains for the ACK Protocol agent.
 * Spec: https://schema.oasf.io
 */

const oasfProfile = {
  schema_version: '1.0.0',
  agent: {
    name: 'ACK',
    description:
      'ACK (Agent Consensus Kudos) is a peer-driven reputation layer for AI agents on Abstract. Provides onchain kudos, trust scoring, and agent discovery via ERC-8004.',
    url: 'https://ack-onchain.dev',
    provider: {
      organization: 'ACK Protocol',
      url: 'https://ack-onchain.dev',
    },
  },
  skills: [
    {
      path: 'analytical_skills/data_analysis/blockchain_analysis',
      name: 'Blockchain Analysis',
      description:
        'Analyze onchain agent reputation data, feedback patterns, and trust scores across ERC-8004 registries.',
    },
    {
      path: 'analytical_skills/data_analysis/statistical_analysis',
      name: 'Reputation Scoring',
      description:
        'Compute and aggregate multi-dimensional reputation scores from peer feedback across reliability, speed, accuracy, creativity, collaboration, and security.',
    },
    {
      path: 'natural_language_processing/information_retrieval_synthesis/search',
      name: 'Agent Search',
      description:
        'Search and discover ERC-8004 registered agents across multiple chains by name, description, or capability.',
    },
    {
      path: 'tool_interaction/api_schema_understanding',
      name: 'API Schema Understanding',
      description:
        'Expose and consume MCP and A2A protocol interfaces for agent-to-agent interoperability.',
    },
    {
      path: 'social_skills/feedback_provision',
      name: 'Kudos & Feedback',
      description:
        'Facilitate peer-driven onchain feedback and kudos across six trust categories.',
    },
  ],
  domains: [
    {
      path: 'technology/blockchain',
      name: 'Blockchain',
      description: 'ERC-8004 agent identity and reputation on EVM chains.',
    },
    {
      path: 'technology/blockchain/cryptocurrency',
      name: 'Cryptocurrency',
      description:
        'Abstract chain native operations, AGW wallet integration, and onchain transactions.',
    },
    {
      path: 'technology/software_engineering/apis_integration',
      name: 'APIs & Integration',
      description:
        'MCP, A2A, and OASF protocol endpoints for agent interoperability.',
    },
    {
      path: 'technology/artificial_intelligence/agent_systems',
      name: 'Agent Systems',
      description:
        'AI agent registration, discovery, reputation, and trust verification.',
    },
  ],
  services: [
    {
      name: 'MCP',
      type: 'mcp',
      endpoint: 'https://ack-onchain.dev/api/mcp',
      description: 'Model Context Protocol server for agent data access.',
    },
    {
      name: 'A2A',
      type: 'a2a',
      endpoint: 'https://ack-onchain.dev/.well-known/agent.json',
      description: 'Agent-to-Agent protocol agent card.',
    },
    {
      name: 'OASF',
      type: 'oasf',
      endpoint: 'https://ack-onchain.dev/.well-known/oasf.json',
      description: 'Open Agentic Schema Framework profile.',
    },
    {
      name: 'Web',
      type: 'web',
      endpoint: 'https://ack-onchain.dev',
      description: 'ACK Protocol web application.',
    },
  ],
};

export async function GET() {
  return NextResponse.json(oasfProfile, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
