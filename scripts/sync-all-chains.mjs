/**
 * Sync ACK agentURI across all chains.
 * 1. Build spec-compliant agentURI
 * 2. Register on Base (new)
 * 3. Update URI on all 3 chains with complete registrations array
 */
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet, base, abstract } from 'viem/chains';
import { gzipSync } from 'zlib';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8');
const pkMatch = envContent.match(/AGENT_PRIVATE_KEY=(.+)/);
let pk = pkMatch[1].trim();
if (!pk.startsWith('0x')) pk = '0x' + pk;
const account = privateKeyToAccount(pk);

console.log('Account:', account.address);

// Registry addresses per chain
const REGISTRIES = {
  abstract: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
  ethereum: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
  base: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
};

// Known agent IDs
const AGENTS = {
  abstract: { chainId: 2741, tokenId: 606, registry: REGISTRIES.abstract },
  ethereum: { chainId: 1, tokenId: 26424, registry: REGISTRIES.ethereum },
  base: { chainId: 8453, tokenId: null, registry: REGISTRIES.base }, // TBD after registration
};

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
  {
    name: 'tokenURI',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'string' }],
  },
];

function buildAgentURI(registrations) {
  const uri = {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: 'ACK',
    description:
      'ACK (Agent Consensus Kudos) is a peer-driven reputation layer for AI agents. Agents and humans give onchain kudos across categories like reliability, speed, accuracy, creativity, collaboration, and security. Built on ERC-8004, ACK surfaces trust through consensus, not self-reported stats.',
    image: 'https://ack-onchain.dev/icon-512.png',
    services: [
      {
        name: 'A2A',
        endpoint: 'https://ack-onchain.dev/.well-known/agent-card.json',
        version: '0.3.0',
      },
      {
        name: 'MCP',
        endpoint: 'https://ack-onchain.dev/api/mcp',
        version: '2025-06-18',
      },
      {
        name: 'OASF',
        endpoint: 'https://ack-onchain.dev/.well-known/oasf.json',
        version: '0.8',
        skills: [
          'natural_language_processing/information_retrieval_synthesis/search',
          'natural_language_processing/conversation/chatbot',
          'analytical_skills/data_analysis/blockchain_analysis',
          'analytical_skills/pattern_recognition/anomaly_detection',
          'tool_interaction/automation/workflow_automation',
        ],
        domains: [
          'technology/blockchain',
          'technology/software_engineering',
          'technology/artificial_intelligence',
        ],
      },
      {
        name: 'web',
        endpoint: 'https://ack-onchain.dev',
      },
      {
        name: 'DID',
        endpoint: 'did:ethr:0x668aDd9213985E7Fd613Aec87767C892f4b9dF1c',
        version: 'v1',
      },
    ],
    x402Support: true,
    active: true,
    registrations,
    supportedTrust: ['reputation'],
  };
  return uri;
}

function compressURI(obj) {
  const json = JSON.stringify(obj);
  const compressed = gzipSync(Buffer.from(json), { level: 9 });
  return `data:application/json;enc=gzip;level=9;base64,${compressed.toString('base64')}`;
}

async function main() {
  const step = process.argv[2] || 'all';

  // Step 1: Register on Base
  if (step === 'all' || step === 'register-base') {
    console.log('\n=== Step 1: Register on Base ===');
    const basePublic = createPublicClient({ chain: base, transport: http() });
    const baseWallet = createWalletClient({
      account,
      chain: base,
      transport: http(),
    });

    // Build temp URI with current registrations (will update after)
    const tempRegistrations = [
      {
        agentId: 606,
        agentRegistry: `eip155:2741:${REGISTRIES.abstract}`,
      },
      {
        agentId: 26424,
        agentRegistry: `eip155:1:${REGISTRIES.ethereum}`,
      },
    ];
    const tempURI = compressURI(buildAgentURI(tempRegistrations));
    console.log('Compressed URI length:', tempURI.length);

    const balance = await basePublic.getBalance({
      address: account.address,
    });
    console.log('Base balance:', Number(balance) / 1e18, 'ETH');

    if (balance < 100000000000000n) {
      console.error('Not enough ETH on Base (need ~0.0001)');
      process.exit(1);
    }

    const { request } = await basePublic.simulateContract({
      account,
      address: REGISTRIES.base,
      abi,
      functionName: 'register',
      args: [tempURI],
      gas: 2_000_000n,
    });
    console.log('Simulation OK, submitting...');
    const hash = await baseWallet.writeContract(request);
    console.log('Base register tx:', hash);

    const receipt = await basePublic.waitForTransactionReceipt({
      hash,
      timeout: 60_000,
    });
    console.log('Status:', receipt.status);

    // Extract token ID from Transfer event
    const transferLog = receipt.logs.find(
      (l) =>
        l.topics[0] ===
        '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    );
    if (transferLog) {
      const tokenId = parseInt(transferLog.topics[3], 16);
      console.log('Base Agent ID:', tokenId);
      AGENTS.base.tokenId = tokenId;
    }
  }

  // If we already know the Base token ID (passed as arg)
  if (process.argv[3]) {
    AGENTS.base.tokenId = parseInt(process.argv[3]);
  }

  // Step 2: Update all chains with complete registrations
  if (step === 'all' || step === 'update-all') {
    if (!AGENTS.base.tokenId) {
      console.error(
        'Base token ID unknown. Run register-base first or pass as arg: node sync-all-chains.mjs update-all <baseTokenId>'
      );
      process.exit(1);
    }

    const registrations = [
      {
        agentId: AGENTS.abstract.tokenId,
        agentRegistry: `eip155:${AGENTS.abstract.chainId}:${AGENTS.abstract.registry}`,
      },
      {
        agentId: AGENTS.ethereum.tokenId,
        agentRegistry: `eip155:${AGENTS.ethereum.chainId}:${AGENTS.ethereum.registry}`,
      },
      {
        agentId: AGENTS.base.tokenId,
        agentRegistry: `eip155:${AGENTS.base.chainId}:${AGENTS.base.registry}`,
      },
    ];

    const finalURI = compressURI(buildAgentURI(registrations));
    console.log('\n=== Step 2: Update all chains ===');
    console.log('Final URI length:', finalURI.length);
    console.log('Registrations:', JSON.stringify(registrations, null, 2));

    // Update Abstract
    console.log('\n--- Abstract #606 ---');
    const absPublic = createPublicClient({
      chain: abstract,
      transport: http(),
    });
    const absWallet = createWalletClient({
      account,
      chain: abstract,
      transport: http(),
    });
    const absHash = await absWallet.writeContract({
      address: REGISTRIES.abstract,
      abi,
      functionName: 'setAgentURI',
      args: [606n, finalURI],
      gas: 2_000_000n,
    });
    console.log('Tx:', absHash);
    const absReceipt = await absPublic.waitForTransactionReceipt({
      hash: absHash,
      timeout: 60_000,
    });
    console.log('Status:', absReceipt.status);

    // Update Ethereum
    console.log('\n--- Ethereum #26424 ---');
    const ethPublic = createPublicClient({
      chain: mainnet,
      transport: http(),
    });
    const ethWallet = createWalletClient({
      account,
      chain: mainnet,
      transport: http(),
    });
    const ethHash = await ethWallet.writeContract({
      address: REGISTRIES.ethereum,
      abi,
      functionName: 'setAgentURI',
      args: [26424n, finalURI],
      gas: 2_000_000n,
    });
    console.log('Tx:', ethHash);
    const ethReceipt = await ethPublic.waitForTransactionReceipt({
      hash: ethHash,
      timeout: 120_000,
    });
    console.log('Status:', ethReceipt.status);

    // Update Base
    console.log('\n--- Base #' + AGENTS.base.tokenId + ' ---');
    const basePublic = createPublicClient({
      chain: base,
      transport: http(),
    });
    const baseWallet = createWalletClient({
      account,
      chain: base,
      transport: http(),
    });
    const baseHash = await baseWallet.writeContract({
      address: REGISTRIES.base,
      abi,
      functionName: 'setAgentURI',
      args: [BigInt(AGENTS.base.tokenId), finalURI],
      gas: 2_000_000n,
    });
    console.log('Tx:', baseHash);
    const baseReceipt = await basePublic.waitForTransactionReceipt({
      hash: baseHash,
      timeout: 60_000,
    });
    console.log('Status:', baseReceipt.status);

    console.log('\n=== Done! All 3 chains synced ===');
    console.log('Abstract #606, Ethereum #26424, Base #' + AGENTS.base.tokenId);
  }
}

main().catch(console.error);
