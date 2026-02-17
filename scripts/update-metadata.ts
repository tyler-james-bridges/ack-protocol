/**
 * Update onchain metadata for ACK agent #606 on Abstract (chain 2741).
 *
 * This script calls setAgentURI to update the base64-encoded metadata
 * with all fields needed for 8004scan compliance scoring.
 *
 * Usage: npx tsx scripts/update-metadata.ts
 *
 * Requires PRIVATE_KEY env var set to the agent owner wallet private key.
 */

import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { abstract } from 'viem/chains';

const IDENTITY_REGISTRY_ADDRESS =
  '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432' as const;

const AGENT_ID = 606n;

const SET_AGENT_URI_ABI = [
  {
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'newURI', type: 'string' },
    ],
    name: 'setAgentURI',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

const metadata = {
  type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
  name: 'ACK',
  description:
    'ACK (Agent Consensus Kudos) is a peer-driven reputation layer for AI agents on Abstract. Agents and humans give onchain kudos across categories like reliability, speed, accuracy, creativity, collaboration, and security. Built on ERC-8004, ACK surfaces trust through consensus, not self-reported stats.',
  image: 'https://ack-onchain.dev/icon-512.png',
  agent_type: 'service',
  active: true,
  x402Support: true,
  tags: ['reputation', 'kudos', 'erc-8004', 'abstract', 'peer-review', 'trust'],
  categories: ['reputation', 'infrastructure', 'social'],
  supportedTrust: ['reputation'],
  capabilities: {
    streaming: false,
    pushNotifications: false,
    a2a: true,
    mcp: true,
    oasf: true,
  },
  services: [
    {
      name: 'mcp',
      endpoint: 'https://ack-onchain.dev/api/mcp',
      version: '2025-06-18',
      tools: [
        'get_agent',
        'get_reputation',
        'search_agents',
        'get_leaderboard',
        'get_agent_feedbacks',
      ],
      prompts: ['reputation_check', 'trust_assessment'],
      resources: ['agent_registry', 'reputation_registry'],
    },
    {
      name: 'a2a',
      endpoint: 'https://ack-onchain.dev/.well-known/agent.json',
      version: '1.0.0',
      skills: [
        'search-agents',
        'get-reputation',
        'give-kudos',
        'check-trust',
        'agent-discovery',
        'reputation-analysis',
        'feedback-aggregation',
        'leaderboard-ranking',
        'cross-chain-lookup',
        'category-scoring',
        'trust-verification',
      ],
    },
    {
      name: 'oasf',
      endpoint: 'https://ack-onchain.dev/.well-known/oasf.json',
      version: '1.0.0',
    },
    {
      name: 'web',
      endpoint: 'https://ack-onchain.dev',
    },
  ],
  registrations: [
    {
      agentId: 606,
      agentRegistry: 'eip155:2741:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
    },
  ],
};

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('PRIVATE_KEY env var is required');
    process.exit(1);
  }

  const account = privateKeyToAccount(
    privateKey.startsWith('0x')
      ? (privateKey as `0x${string}`)
      : (`0x${privateKey}` as `0x${string}`)
  );

  console.log('Account:', account.address);

  const encoded = Buffer.from(JSON.stringify(metadata)).toString('base64');
  const dataURI = `data:application/json;base64,${encoded}`;

  console.log('Metadata size:', encoded.length, 'bytes (base64)');
  console.log('Agent ID:', AGENT_ID.toString());

  const publicClient = createPublicClient({
    chain: abstract,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: abstract,
    transport: http(),
  });

  console.log('Sending setAgentURI transaction...');

  const hash = await walletClient.writeContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: SET_AGENT_URI_ABI,
    functionName: 'setAgentURI',
    args: [AGENT_ID, dataURI],
  });

  console.log('Transaction hash:', hash);
  console.log('Waiting for confirmation...');

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('Confirmed in block:', receipt.blockNumber.toString());
  console.log('Status:', receipt.status);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
