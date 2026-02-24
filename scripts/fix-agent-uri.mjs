/**
 * Fix ACK agent #606 onchain agentURI metadata.
 * Fixes:
 * 1. supportedTrusts → supportedTrust (IA010)
 * 2. Add registrations array (IA005)
 * 3. Fix OASF skill/domain paths to match standard (IA027/IA028)
 * 4. x402support → x402Support (case fix)
 */
import {
  createWalletClient,
  createPublicClient,
  http,
  encodeFunctionData,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { abstract } from 'viem/chains';
import { gunzipSync, gzipSync } from 'zlib';

const IDENTITY_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const AGENT_ID = 606n;
const PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY;

if (!PRIVATE_KEY) {
  // Try .env.local
  const fs = await import('fs');
  const envPath = new URL('../.env.local', import.meta.url).pathname;
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const match = envContent.match(/AGENT_PRIVATE_KEY=(.+)/);
  if (match) {
    let key = match[1].trim();
    if (!key.startsWith('0x')) key = '0x' + key;
    process.env.AGENT_PRIVATE_KEY = key;
  } else {
    console.error('AGENT_PRIVATE_KEY not found');
    process.exit(1);
  }
}

const abi = [
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

async function main() {
  let pk = process.env.AGENT_PRIVATE_KEY;
  if (!pk.startsWith('0x')) pk = '0x' + pk;
  const account = privateKeyToAccount(pk);
  console.log('Account:', account.address);

  const publicClient = createPublicClient({
    chain: abstract,
    transport: http(),
  });
  const walletClient = createWalletClient({
    account,
    chain: abstract,
    transport: http(),
  });

  // Read current URI
  const currentURI = await publicClient.readContract({
    address: IDENTITY_REGISTRY,
    abi,
    functionName: 'tokenURI',
    args: [AGENT_ID],
  });

  const b64 = currentURI.split('base64,')[1];
  const buf = Buffer.from(b64, 'base64');
  const json = gunzipSync(buf).toString('utf-8');
  const data = JSON.parse(json);

  console.log('\n=== Current issues ===');

  // Fix 1: supportedTrusts → supportedTrust
  if (data.supportedTrusts) {
    console.log('FIX: supportedTrusts → supportedTrust');
    data.supportedTrust = data.supportedTrusts;
    delete data.supportedTrusts;
  }

  // Fix 2: Add registrations
  if (!data.registrations || data.registrations.length === 0) {
    console.log('FIX: Adding registrations array');
    data.registrations = [
      {
        agentId: 606,
        agentRegistry: 'eip155:2741:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
      },
    ];
  }

  // Fix 3: x402support → x402Support
  if ('x402support' in data && !('x402Support' in data)) {
    console.log('FIX: x402support → x402Support');
    data.x402Support = data.x402support;
    delete data.x402support;
  }

  // Fix 4: OASF skill paths to match standard (use Meerkat-style paths)
  const oasfService = data.services?.find((s) => s.name === 'OASF');
  if (oasfService) {
    console.log('FIX: Updating OASF skill paths to standard format');
    oasfService.skills = [
      'natural/language/processing/natural/language/generation/text/generation',
      'natural/language/processing/natural/language/understanding/contextual/comprehension',
      'natural/language/processing/information/retrieval/synthesis/search',
      'tool/interaction/automation/workflow/automation',
      'natural/language/processing/conversation/chatbot',
    ];
    oasfService.domains = [
      'technology/blockchain',
      'technology/software/engineering',
      'technology/artificial/intelligence',
    ];
  }

  // Fix 5: Ensure A2A has skills listed in the metadata (for a2a_stats.skills_count)
  const a2aService = data.services?.find((s) => s.name === 'A2A');
  if (a2aService) {
    console.log('FIX: Ensuring A2A skills are listed');
    a2aService.a2aSkills = [
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
    ];
  }

  console.log('\n=== Updated metadata ===');
  const newJSON = JSON.stringify(data);
  console.log('Keys:', Object.keys(data));
  console.log('registrations:', JSON.stringify(data.registrations));
  console.log('supportedTrust:', data.supportedTrust);
  console.log('x402Support:', data.x402Support);
  console.log('OASF skills count:', oasfService?.skills?.length);
  console.log('A2A skills count:', a2aService?.a2aSkills?.length);

  // Compress and encode
  const compressed = gzipSync(Buffer.from(newJSON), { level: 6 });
  const newURI = `data:application/json;enc=gzip;level=6;base64,${compressed.toString('base64')}`;
  console.log('\nNew URI length:', newURI.length);

  console.log('\nSending setAgentURI tx...');
  const hash = await walletClient.writeContract({
    address: IDENTITY_REGISTRY,
    abi,
    functionName: 'setAgentURI',
    args: [AGENT_ID, newURI],
  });

  console.log('Tx hash:', hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('Status:', receipt.status);
  console.log('Block:', receipt.blockNumber.toString());
  console.log('Done.');
}

main().catch(console.error);
