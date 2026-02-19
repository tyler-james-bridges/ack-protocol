#!/usr/bin/env node
/**
 * Give a bare kudos (no message, no category) to any agent.
 * Usage: node scripts/quick-kudos.mjs <agentId> [message] [category]
 *
 * Examples:
 *   node scripts/quick-kudos.mjs 603
 *   node scripts/quick-kudos.mjs 603 "solid work"
 *   node scripts/quick-kudos.mjs 603 "solid work" reliability
 */

import { createPublicClient, createWalletClient, http, keccak256, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from 'dotenv';

config({ path: '.env.local' });

const REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const REPUTATION = '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63';
const CHAIN_ID = 2741;
const RPC = 'https://api.mainnet.abs.xyz';

const abstract = {
  id: CHAIN_ID,
  name: 'Abstract',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
};

const ABI = [
  {
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'value', type: 'int128' },
      { name: 'valueDecimals', type: 'uint8' },
      { name: 'tag1', type: 'string' },
      { name: 'tag2', type: 'string' },
      { name: 'endpoint', type: 'string' },
      { name: 'feedbackURI', type: 'string' },
      { name: 'feedbackHash', type: 'bytes32' },
    ],
    name: 'giveFeedback',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

const agentId = parseInt(process.argv[2]);
const message = process.argv[3] || '';
const category = process.argv[4] || '';

if (!agentId || isNaN(agentId)) {
  console.error('Usage: node scripts/quick-kudos.mjs <agentId> [message] [category]');
  process.exit(1);
}

const key = process.env.AGENT_PRIVATE_KEY;
if (!key) {
  console.error('AGENT_PRIVATE_KEY not set in .env.local');
  process.exit(1);
}

const account = privateKeyToAccount(key.startsWith('0x') ? key : `0x${key}`);

const publicClient = createPublicClient({ chain: abstract, transport: http() });
const walletClient = createWalletClient({ chain: abstract, transport: http(), account });

const feedbackFile = {
  agentRegistry: `eip155:${CHAIN_ID}:${REGISTRY}`,
  agentId,
  clientAddress: `eip155:${CHAIN_ID}:${account.address}`,
  createdAt: new Date().toISOString(),
  value: '5',
  valueDecimals: 0,
  tag1: 'kudos',
  tag2: category,
  reasoning: message,
};

const jsonStr = JSON.stringify(feedbackFile);
const feedbackURI = message || category
  ? `data:application/json;base64,${Buffer.from(jsonStr).toString('base64')}`
  : '';
const feedbackHash = feedbackURI
  ? keccak256(toHex(jsonStr))
  : '0x0000000000000000000000000000000000000000000000000000000000000000';

console.log(`Sending kudos to agent #${agentId}...`);
if (category) console.log(`  Category: ${category}`);
if (message) console.log(`  Message: "${message}"`);
if (!category && !message) console.log('  Bare kudos (no message, no category)');

const hash = await walletClient.writeContract({
  address: REPUTATION,
  abi: ABI,
  functionName: 'giveFeedback',
  args: [
    BigInt(agentId),
    5n,
    0,
    'kudos',
    category,
    '',
    feedbackURI,
    feedbackHash,
  ],
});

console.log(`Tx sent: ${hash}`);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log(`Confirmed in block ${receipt.blockNumber}`);
console.log(`https://abscan.org/tx/${hash}`);
