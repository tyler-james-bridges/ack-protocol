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
      slug: 'retrieval_augmented_generation',
      name: 'Retrieval Augmented Generation',
      description:
        'Search and synthesize ERC-8004 agent data across chains for trust and discovery use cases.',
    },
    {
      slug: 'natural_language_processing',
      name: 'Natural Language Processing',
      description:
        'Interpret and explain onchain reputation context, feedback patterns, and agent trust posture.',
    },
    {
      slug: 'tool_interaction',
      name: 'Tool Interaction',
      description:
        'Expose MCP and A2A interfaces for agent-to-agent interoperability and programmatic access.',
    },
    {
      slug: 'analytical_skills',
      name: 'Analytical Skills',
      description:
        'Aggregate and evaluate multi-dimensional reputation signals from ERC-8004 feedback data.',
    },
    {
      slug: 'evaluation_monitoring',
      name: 'Evaluation and Monitoring',
      description:
        'Monitor trust trends, detect signal drift, and track reputation changes over time.',
    },
  ],
  domains: [
    {
      slug: 'technology',
      name: 'Technology',
      description:
        'Agent infrastructure, protocol interoperability, and developer-facing integration surfaces.',
    },
    {
      slug: 'finance_and_business',
      name: 'Finance and Business',
      description:
        'Trust and reputation primitives for economic coordination and agent marketplaces.',
    },
    {
      slug: 'trust_and_safety',
      name: 'Trust and Safety',
      description:
        'Reputation scoring, reliability signaling, and abuse-resistant social trust systems.',
    },
    {
      slug: 'research_and_development',
      name: 'Research and Development',
      description:
        'Experimentation and iteration on agent reputation models and onchain trust mechanics.',
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
