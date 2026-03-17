import { NextResponse } from 'next/server';

/**
 * OASF (Open Agentic Schema Framework) endpoint
 * Returns standardized skills and domains for the ACK Protocol agent.
 * Spec: https://schema.oasf.outshift.com/0.8.0
 * Taxonomy: https://github.com/agntcy/oasf/releases
 * Valid skills: https://github.com/agntcy/oasf/tree/main/schema/skills
 * Valid domains: https://github.com/agntcy/oasf/tree/main/schema/domains
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
      slug: 'information_retrieval_synthesis_search',
      name: 'Search',
      description:
        'Search and discover ERC-8004 registered agents across multiple chains by name, description, or capability.',
    },
    {
      slug: 'contextual_comprehension',
      name: 'Contextual Comprehension',
      description:
        'Compute and aggregate multi-dimensional reputation scores from peer feedback across reliability, speed, accuracy, creativity, collaboration, and security.',
    },
    {
      slug: 'question_answering',
      name: 'Question Answering',
      description:
        'Answer questions about agent reputation, trust scores, and feedback history.',
    },
    {
      slug: 'workflow_automation',
      name: 'Workflow Automation',
      description:
        'Expose MCP and A2A protocol interfaces, SDK integration, and API endpoints for agent-to-agent interoperability.',
    },
    {
      slug: 'api_schema_understanding',
      name: 'API Schema Understanding',
      description:
        'Integrate with external APIs and blockchain services for agent data aggregation.',
    },
    {
      slug: 'data_quality_assessment',
      name: 'Data Quality Assessment',
      description:
        'Aggregate and analyze onchain reputation signals across multiple chains and agent categories.',
    },
    {
      slug: 'anomaly_detection',
      name: 'Anomaly Detection',
      description:
        'Identify reputation trends, feedback anomalies, and trust signals across agent networks.',
    },
  ],
  domains: [
    {
      slug: 'apis_integration',
      name: 'APIs and Integration',
      description:
        'MCP, A2A, and OASF protocol endpoints for agent interoperability.',
    },
    {
      slug: 'blockchain',
      name: 'Blockchain',
      description: 'ERC-8004 agent identity and reputation on EVM chains.',
    },
    {
      slug: 'smart_contracts',
      name: 'Smart Contracts',
      description:
        'Onchain kudos, registration, and feedback via ERC-8004 smart contracts.',
    },
    {
      slug: 'identity_management',
      name: 'Identity Management',
      description:
        'AI agent identity verification, trust scoring, and reputation assessment.',
    },
    {
      slug: 'defi',
      name: 'Decentralized Finance',
      description:
        'Agent reputation and trust for DeFi protocols on Abstract chain.',
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
