/**
 * Deploy HandleRegistry contract to Abstract.
 * Run: node scripts/deploy-handle-registry.mjs
 */
import {
  createWalletClient,
  createPublicClient,
  http,
  defineChain,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

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

async function main() {
  const rawKey = process.env.AGENT_PRIVATE_KEY;
  if (!rawKey) throw new Error('AGENT_PRIVATE_KEY not set in .env.local');
  const privateKey = rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`;

  const account = privateKeyToAccount(privateKey);
  console.log('Deployer:', account.address);

  // Compile the contract with solc
  console.log('Compiling HandleRegistry...');

  // Check if solc is available
  try {
    execSync('solc --version', { stdio: 'pipe' });
  } catch {
    console.error('solc not found. Install with: brew install solidity');
    console.error('Or use: npm install -g solc');
    process.exit(1);
  }

  execSync(
    'solc --optimize --optimize-runs 200 --combined-json abi,bin contracts/HandleRegistry.sol -o contracts/build --overwrite',
    { stdio: 'inherit' }
  );

  const combined = JSON.parse(
    readFileSync('contracts/build/combined.json', 'utf-8')
  );
  const contractKey = Object.keys(combined.contracts).find((k) =>
    k.endsWith(':HandleRegistry')
  );
  if (!contractKey)
    throw new Error('HandleRegistry not found in compiled output');

  const { abi, bin } = combined.contracts[contractKey];
  const bytecode = `0x${bin}`;

  console.log(`Bytecode size: ${bin.length / 2} bytes`);

  const publicClient = createPublicClient({
    chain: abstract,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: abstract,
    transport: http(),
  });

  // Encode constructor args: operator = deployer address
  const { encodeAbiParameters } = await import('viem');
  const constructorArgs = encodeAbiParameters(
    [{ type: 'address' }],
    [account.address]
  );

  const deployData = bytecode + constructorArgs.slice(2);

  console.log('Deploying HandleRegistry...');
  console.log('Operator:', account.address);

  const hash = await walletClient.sendTransaction({
    data: deployData,
  });

  console.log('Tx hash:', hash);
  console.log('Abscan:', `https://abscan.org/tx/${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status !== 'success') {
    throw new Error('Deployment failed');
  }

  console.log('Contract deployed at:', receipt.contractAddress);
  console.log('Block:', receipt.blockNumber.toString());
  console.log('\nAdd to .env.local:');
  console.log(`HANDLE_REGISTRY_ADDRESS=${receipt.contractAddress}`);
}

main().catch(console.error);
