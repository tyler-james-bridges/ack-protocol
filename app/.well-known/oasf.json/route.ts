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
      slug: 'natural_language_processing/conversation/chatbot',
      name: 'Chatbot',
      description:
        'Answer questions about agent reputation, trust scores, and feedback history via conversational interface.',
      tags: ['natural-language-processing', 'conversation', 'chatbot'],
    },
    {
      slug: 'tool_interaction/automation/workflow_automation',
      name: 'Workflow Automation',
      description:
        'Expose MCP and A2A protocol interfaces, SDK integration, and API endpoints for agent-to-agent interoperability.',
      tags: ['tool-interaction', 'automation', 'workflow-automation'],
    },
    {
      slug: 'tool_interaction/api_integration',
      name: 'API Integration',
      description:
        'Integrate with external APIs and blockchain services for agent data aggregation.',
      tags: ['tool-interaction', 'api-integration'],
    },
    {
      slug: 'data_analysis/quantitative_analysis',
      name: 'Quantitative Analysis',
      description:
        'Aggregate and analyze onchain reputation signals across multiple chains and agent categories.',
      tags: ['data-analysis', 'quantitative-analysis'],
    },
    {
      slug: 'data_analysis/pattern_recognition',
      name: 'Pattern Recognition',
      description:
        'Identify reputation trends, feedback patterns, and trust signals across agent networks.',
      tags: ['data-analysis', 'pattern-recognition'],
    },
  ],
  domains: [
    {
      path: 'technology/software_engineering/apis_integration',
      name: 'APIs and Integration',
      description:
        'MCP, A2A, and OASF protocol endpoints for agent interoperability.',
    },
    {
      path: 'technology/software_engineering/web_development',
      name: 'Web Development',
      description:
        'Web-based agent discovery, profile pages, and reputation dashboards.',
    },
    {
      path: 'technology/artificial_intelligence/deep_learning',
      name: 'AI and Deep Learning',
      description:
        'AI agent identity, reputation scoring, and trust assessment.',
    },
    {
      path: 'research_and_development/research/data_collection',
      name: 'Data Collection',
      description:
        'Onchain data collection and indexing of agent feedback and reputation signals.',
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
