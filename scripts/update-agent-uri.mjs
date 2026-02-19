/**
 * Updates the onchain agentURI for ACK agent #606.
 * Removes agentWallet from off-chain metadata (should only be set via setAgentWallet onchain).
 * Run: node scripts/update-agent-uri.mjs
 */
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config({ path: '.env.local' });

const abstract = defineChain({
  id: 2741,
  name: 'Abstract',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://api.mainnet.abs.xyz'] } },
  blockExplorers: {
    default: { name: 'Abscan', url: 'https://abscan.org' },
  },
});

const IDENTITY_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const AGENT_ID = 606n;

const abi = [
  {
    name: 'setAgentURI',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'uri', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'tokenURI',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
];

async function main() {
  const rawKey = process.env.AGENT_PRIVATE_KEY;
  if (!rawKey) throw new Error('AGENT_PRIVATE_KEY not set in .env.local');
  const privateKey = rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`;

  const account = privateKeyToAccount(privateKey);
  console.log('Wallet:', account.address);

  const publicClient = createPublicClient({
    chain: abstract,
    transport: http(),
  });
  const walletClient = createWalletClient({
    account,
    chain: abstract,
    transport: http(),
  });

  // Fetch current onchain URI
  const currentURI = await publicClient.readContract({
    address: IDENTITY_REGISTRY,
    abi,
    functionName: 'tokenURI',
    args: [AGENT_ID],
  });

  // Decode current data URI
  const b64 = currentURI.split(',')[1];
  const current = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
  console.log('Current keys:', Object.keys(current));
  console.log('Current agentWallet:', current.agentWallet ?? '(missing)');

  // Remove agentWallet from off-chain metadata (WA083: use setAgentWallet() onchain instead)
  if (current.agentWallet) {
    console.log('Removing agentWallet from off-chain metadata...');
    delete current.agentWallet;
  } else {
    console.log('No agentWallet in metadata, nothing to remove.');
    return;
  }

  // Re-encode
  const newJSON = JSON.stringify(current);
  const newURI = `data:application/json;base64,${Buffer.from(newJSON).toString('base64')}`;
  console.log('New URI length:', newURI.length);

  // Submit tx
  console.log('Sending setAgentURI tx...');
  const hash = await walletClient.writeContract({
    address: IDENTITY_REGISTRY,
    abi,
    functionName: 'setAgentURI',
    args: [AGENT_ID, newURI],
  });

  console.log('Tx hash:', hash);
  console.log('Abscan:', `https://abscan.org/tx/${hash}`);

  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('Confirmed in block:', receipt.blockNumber.toString());
  console.log('Done. agentWallet removed from onchain URI.');
}

main().catch(console.error);
