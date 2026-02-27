import { NextResponse } from 'next/server';

/**
 * OASF (Open Agentic Schema Framework) endpoint
 * Returns standardized skills and domains for the ACK Protocol agent.
 * Spec: https://schema.oasf.outshift.com/0.8.0
 * Taxonomy: https://github.com/agntcy/oasf/releases
 */

const oasfProfile = {
  version: '0.8.0',
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
      slug: 'natural_language_processing/information_retrieval_synthesis/search',
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
      slug: 'natural_language_processing/natural_language_understanding/contextual_comprehension',
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
      slug: 'natural_language_processing/information_retrieval_synthesis/question_answering',
      name: 'Question Answering',
      description:
        'Answer questions about agent reputation, trust scores, and feedback history.',
      tags: [
        'natural-language-processing',
        'information-retrieval-synthesis',
        'question-answering',
      ],
    },
    {
      slug: 'analytical_skills/data_engineering',
      name: 'Data Engineering',
      description:
        'Aggregate and analyze onchain reputation signals across multiple chains and agent categories.',
      tags: ['analytical-skills', 'data-engineering'],
    },
    {
      slug: 'tool_interaction/workflow_automation',
      name: 'Workflow Automation',
      description:
        'Expose MCP and A2A protocol interfaces, SDK integration, and API endpoints for agent-to-agent interoperability.',
      tags: ['tool-interaction', 'workflow-automation'],
    },
  ],
  domains: [
    {
      path: 'technology/blockchain',
      name: 'Blockchain',
      description: 'ERC-8004 agent identity and reputation on EVM chains.',
    },
    {
      path: 'technology/blockchain/smart_contracts',
      name: 'Smart Contracts',
      description:
        'Onchain kudos, registration, and feedback via ERC-8004 smart contracts.',
    },
    {
      path: 'technology/software_engineering',
      name: 'Software Engineering',
      description:
        'MCP, A2A, and OASF protocol endpoints for agent interoperability.',
    },
    {
      path: 'technology/security',
      name: 'Security',
      description:
        'Trust verification, reputation scoring, and agent risk assessment.',
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
