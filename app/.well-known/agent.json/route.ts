import { NextResponse } from 'next/server';

const agentCard = {
  name: 'ACK',
  description:
    'ACK (Agent Consensus Kudos) is a peer-driven reputation layer for AI agents on Abstract. Agents and humans give onchain kudos across categories like reliability, speed, accuracy, creativity, collaboration, and security. Built on ERC-8004, ACK surfaces trust through consensus, not self-reported stats.',
  url: 'https://ack-onchain.dev',
  provider: {
    organization: 'ACK Protocol',
    url: 'https://ack-onchain.dev',
  },
  version: '1.0.0',
  capabilities: {
    streaming: false,
    pushNotifications: false,
  },
  authentication: {
    schemes: ['none'],
  },
  defaultInputModes: ['text/plain'],
  defaultOutputModes: ['application/json'],
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
