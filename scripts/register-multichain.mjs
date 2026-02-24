/**
 * Register ACK on additional chains (Ethereum, Base).
 * Uses the same agentURI as Abstract.
 */
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet, base } from 'viem/chains';
import { gunzipSync, gzipSync } from 'zlib';
import { readFileSync } from 'fs';

const REGISTRY_ETH = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const REGISTRY_BASE = '0x8004A818BFB912233c491871b3d84c89A494BD9e';

const abi = [
  {
    name: 'register',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agentURI', type: 'string' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'setAgentURI',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'uri', type: 'string' },
    ],
    outputs: [],
  },
];

async function main() {
  const env = readFileSync(
    new URL('../.env.local', import.meta.url).pathname,
    'utf-8'
  );
  let pk = env.match(/AGENT_PRIVATE_KEY=(.+)/)[1].trim();
  if (!pk.startsWith('0x')) pk = '0x' + pk;
  const account = privateKeyToAccount(pk);
  console.log('Account:', account.address);

  const chain = process.argv[2] || 'ethereum';
  const selectedChain = chain === 'base' ? base : mainnet;
  const registry = chain === 'base' ? REGISTRY_BASE : REGISTRY_ETH;

  console.log(
    `\nRegistering on ${selectedChain.name} (chain ${selectedChain.id})`
  );
  console.log('Registry:', registry);

  const publicClient = createPublicClient({
    chain: selectedChain,
    transport: http(),
  });
  const walletClient = createWalletClient({
    account,
    chain: selectedChain,
    transport: http(),
  });

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log('Balance:', (Number(balance) / 1e18).toFixed(6), 'ETH');

  if (balance === 0n) {
    console.error('No ETH on this chain. Fund the wallet first.');
    process.exit(1);
  }

  // Build agentURI - same as Abstract but with multi-chain registrations
  const agentData = {
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
      },
      {
        name: 'OASF',
        endpoint: 'https://ack-onchain.dev/.well-known/oasf.json',
        version: 'v0.8.0',
        skills: [
          'natural/language/processing/natural/language/generation/text/generation',
          'natural/language/processing/natural/language/understanding/contextual/comprehension',
          'natural/language/processing/information/retrieval/synthesis/search',
          'tool/interaction/automation/workflow/automation',
          'natural/language/processing/conversation/chatbot',
        ],
        domains: [
          'technology/blockchain',
          'technology/software/engineering',
          'technology/artificial/intelligence',
        ],
      },
      { name: 'x402', endpoint: 'https://ack-onchain.dev/api/x402' },
      { name: 'web', endpoint: 'https://ack-onchain.dev' },
      {
        name: 'A2A',
        endpoint: 'https://ack-onchain.dev/.well-known/agent-card.json',
        version: '0.3.0',
        a2aSkills: [
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
    ],
    registrations: [
      {
        agentId: 606,
        agentRegistry: 'eip155:2741:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
      },
      // Will be updated after registration with new IDs
    ],
    supportedTrust: ['reputation'],
    active: true,
    x402Support: true,
  };

  // Compress and encode
  const compressed = gzipSync(Buffer.from(JSON.stringify(agentData)), {
    level: 6,
  });
  const agentURI = `data:application/json;enc=gzip;level=6;base64,${compressed.toString('base64')}`;
  console.log('URI length:', agentURI.length);

  // Estimate cost with 2M gas
  const gasPrice = await publicClient.getGasPrice();
  const costWei = 2_000_000n * gasPrice;
  console.log('Max cost (2M gas):', (Number(costWei) / 1e18).toFixed(6), 'ETH');
  console.log('Gas price:', (Number(gasPrice) / 1e9).toFixed(2), 'gwei');

  console.log('\nRegistering...');
  const hash = await walletClient.writeContract({
    address: registry,
    abi,
    functionName: 'register',
    args: [agentURI],
    gas: 2_000_000n,
  });

  console.log('Tx hash:', hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('Status:', receipt.status);
  console.log('Block:', receipt.blockNumber.toString());

  // Parse the token ID from Transfer event
  const transferTopic =
    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  const transferLog = receipt.logs.find((l) => l.topics[0] === transferTopic);
  if (transferLog) {
    const tokenId = parseInt(transferLog.topics[3], 16);
    console.log(`\nRegistered as Agent #${tokenId} on ${selectedChain.name}!`);
  }

  console.log('Done.');
}

main().catch(console.error);
