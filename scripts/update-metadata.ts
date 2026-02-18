/**
 * Update ACK agent #606 onchain metadata via setAgentURI
 * Adds trust_mechanisms and refreshes the base64 data URI
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

  // 1. Read current tokenURI
  console.log('Reading current tokenURI...');
  const currentURI = await publicClient.readContract({
    address: IDENTITY_REGISTRY,
    abi: ABI,
    functionName: 'tokenURI',
    args: [AGENT_ID],
  });

  // 2. Decode current metadata
  let metadata: Record<string, unknown>;
  if (currentURI.startsWith('data:application/json;base64,')) {
    const b64 = currentURI.replace('data:application/json;base64,', '');
    metadata = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
  } else if (currentURI.startsWith('data:,')) {
    metadata = JSON.parse(currentURI.replace('data:,', ''));
  } else {
    throw new Error(`Unexpected URI format: ${currentURI.slice(0, 80)}`);
  }

  console.log('Current metadata keys:', Object.keys(metadata));
  console.log(
    'Current trust_mechanisms:',
    (metadata as Record<string, unknown>).trust_mechanisms || 'none'
  );

  // 3. Update metadata
  metadata.trust_mechanisms = ['reputation'];

  console.log('Updated metadata:', JSON.stringify(metadata, null, 2));

  // 4. Encode as base64 data URI
  const jsonStr = JSON.stringify(metadata);
  const b64 = Buffer.from(jsonStr).toString('base64');
  const newURI = `data:application/json;base64,${b64}`;

  console.log(`New URI size: ${newURI.length} bytes`);

  // 5. Send setAgentURI transaction
  console.log('Sending setAgentURI transaction...');
  const hash = await walletClient.writeContract({
    address: IDENTITY_REGISTRY,
    abi: ABI,
    functionName: 'setAgentURI',
    args: [AGENT_ID, newURI],
  });

  console.log('Transaction hash:', hash);

  // 6. Wait for confirmation
  console.log('Waiting for confirmation...');
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('Confirmed in block:', receipt.blockNumber);
  console.log('Status:', receipt.status);
}

main().catch((err) => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
