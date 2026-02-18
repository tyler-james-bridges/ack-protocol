/**
 * Update ACK agent #606 onchain agentURI to be fully ERC-8004 spec-compliant
 */
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { abstract } from 'viem/chains';

const IDENTITY_REGISTRY = '0x8004a169fb4a3325136eb29fa0ceb6d2e539a432';
const AGENT_ID = 606n;

const ABI = [
  {
    inputs: [{ name: 'agentId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
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

// ERC-8004 spec-compliant registration file
// Ref: https://eips.ethereum.org/EIPS/eip-8004
// Ref: https://best-practices.8004scan.io/docs/01-agent-metadata-standard.html
const registrationFile = {
  type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
  name: 'ACK',
  description:
    'ACK (Agent Consensus Kudos) is a peer-driven reputation layer for AI agents on Abstract. Agents and humans give onchain kudos across categories like reliability, speed, accuracy, creativity, collaboration, and security. Built on ERC-8004, ACK surfaces trust through consensus, not self-reported stats.',
  image: 'https://ack-onchain.dev/icon-512.png',
  services: [
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
      mcpPrompts: ['reputation_check', 'trust_assessment'],
      mcpResources: ['agent_registry', 'reputation_registry'],
      capabilities: [],
    },
    {
      name: 'A2A',
      endpoint: 'https://ack-onchain.dev/.well-known/agent.json',
      version: '0.3.0',
      a2aSkills: [
        'analytical_skills/data_analysis/blockchain_analysis',
        'social_skills/feedback_provision',
        'natural_language_processing/information_retrieval_synthesis/search',
      ],
    },
    {
      name: 'OASF',
      endpoint: 'https://ack-onchain.dev/.well-known/oasf.json',
      version: '0.8',
      skills: [
        'analytical_skills/data_analysis/blockchain_analysis',
        'analytical_skills/data_analysis/statistical_analysis',
        'natural_language_processing/information_retrieval_synthesis/search',
        'tool_interaction/api_schema_understanding',
        'social_skills/feedback_provision',
      ],
      domains: [
        'technology/blockchain',
        'technology/blockchain/cryptocurrency',
        'technology/software_engineering/apis_integration',
        'technology/artificial_intelligence/agent_systems',
      ],
    },
    {
      name: 'web',
      endpoint: 'https://ack-onchain.dev',
    },
  ],
  x402Support: false,
  active: true,
  registrations: [
    {
      agentId: 606,
      agentRegistry: 'eip155:2741:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
    },
  ],
  supportedTrust: ['reputation'],
};

async function main() {
  const pk = process.env.AGENT_PRIVATE_KEY;
  if (!pk) throw new Error('AGENT_PRIVATE_KEY not set');

  const prefixed = pk.startsWith('0x') ? pk : `0x${pk}`;
  const account = privateKeyToAccount(prefixed as `0x${string}`);
  console.log('Wallet:', account.address);

  const transport = http('https://api.mainnet.abs.xyz');

  const publicClient = createPublicClient({
    chain: abstract,
    transport,
  });

  const walletClient = createWalletClient({
    account,
    chain: abstract,
    transport,
  });

  // 1. Read current
  console.log('Reading current tokenURI...');
  const currentURI = await publicClient.readContract({
    address: IDENTITY_REGISTRY,
    abi: ABI,
    functionName: 'tokenURI',
    args: [AGENT_ID],
  });

  if (currentURI.startsWith('data:application/json;base64,')) {
    const b64 = currentURI.replace('data:application/json;base64,', '');
    const current = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
    console.log('Current keys:', Object.keys(current));
  }

  // 2. Build new URI
  const jsonStr = JSON.stringify(registrationFile);
  const b64 = Buffer.from(jsonStr).toString('base64');
  const newURI = `data:application/json;base64,${b64}`;

  console.log('\nNew registration file:');
  console.log(JSON.stringify(registrationFile, null, 2));
  console.log(`\nURI size: ${newURI.length} bytes`);

  // 3. Dry run check
  if (process.argv.includes('--dry-run')) {
    console.log('\n[DRY RUN] Would send setAgentURI transaction');
    return;
  }

  // 4. Send tx
  console.log('\nSending setAgentURI transaction...');
  const hash = await walletClient.writeContract({
    address: IDENTITY_REGISTRY,
    abi: ABI,
    functionName: 'setAgentURI',
    args: [AGENT_ID, newURI],
  });

  console.log('Transaction hash:', hash);

  console.log('Waiting for confirmation...');
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('Confirmed in block:', receipt.blockNumber);
  console.log('Status:', receipt.status);
}

main().catch((err) => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
