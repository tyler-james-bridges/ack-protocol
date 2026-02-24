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
      slug: 'natural/language/processing/information/retrieval/synthesis/search',
      name: 'Search',
      description:
        'Search and discover ERC-8004 registered agents across multiple chains by name, description, or capability.',
      tags: [
        'natural-language-processing',
        'information-retrieval-synthesis',
        'search',
      ],
    },
    {
      slug: 'natural/language/processing/natural/language/understanding/contextual/comprehension',
      name: 'Contextual Comprehension',
      description:
        'Compute and aggregate multi-dimensional reputation scores from peer feedback across reliability, speed, accuracy, creativity, collaboration, and security.',
      tags: [
        'natural-language-processing',
        'natural-language-understanding',
        'contextual-comprehension',
      ],
    },
    {
      slug: 'natural/language/processing/natural/language/generation/text/generation',
      name: 'Text Generation',
      description:
        'Generate reputation reports, trust assessments, and agent analysis summaries.',
      tags: [
        'natural-language-processing',
        'natural-language-generation',
        'text-generation',
      ],
    },
    {
      slug: 'tool/interaction/automation/workflow/automation',
      name: 'Workflow Automation',
      description:
        'Expose MCP and A2A protocol interfaces, SDK integration, and API endpoints for agent-to-agent interoperability.',
      tags: ['tool-interaction', 'automation', 'workflow-automation'],
    },
    {
      slug: 'natural/language/processing/conversation/chatbot',
      name: 'Chatbot',
      description:
        'Interactive agent for reputation queries, kudos submission, and trust verification.',
      tags: ['natural-language-processing', 'conversation', 'chatbot'],
    },
  ],
  domains: [
    {
      path: 'blockchain',
      name: 'Blockchain',
      description: 'ERC-8004 agent identity and reputation on EVM chains.',
    },
    {
      path: 'software_engineering',
      name: 'Software Engineering',
      description:
        'MCP, A2A, and OASF protocol endpoints for agent interoperability.',
    },
    {
      path: 'security',
      name: 'Security',
      description:
        'Trust verification, reputation scoring, and agent risk assessment.',
    },
    {
      path: 'data_science',
      name: 'Data Science',
      description:
        'Aggregation and analysis of onchain reputation signals across multiple chains and agent categories.',
    },
    {
      path: 'finance',
      name: 'Finance',
      description:
        'X402 payment protocol support for premium reputation queries and agent-to-agent value exchange.',
    },
  ],
  x402Support: true,
  supportedTrust: ['reputation'],
  services: [
    {
      name: 'MCP',
      type: 'mcp',
      version: '2025-06-18',
      endpoint: 'https://ack-onchain.dev/api/mcp',
      description: 'Model Context Protocol server for agent data access.',
    },
    {
      name: 'A2A',
      type: 'a2a',
      version: '0.3.0',
      endpoint: 'https://ack-onchain.dev/.well-known/agent-card.json',
      description: 'Agent-to-Agent protocol agent card.',
    },
    {
      name: 'OASF',
      type: 'oasf',
      version: '0.8',
      endpoint: 'https://ack-onchain.dev/.well-known/oasf.json',
      description: 'Open Agentic Schema Framework profile.',
    },
    {
      name: 'x402',
      type: 'x402',
      endpoint: 'https://ack-onchain.dev/api/x402',
      description: 'X402 payment protocol for premium reputation queries.',
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
