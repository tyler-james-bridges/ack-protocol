import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { abstractTestnet } from 'viem/chains';
import contractAbi from '../artifacts/contracts/KudosTracker.sol/KudosTracker.json';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;

async function registerTestUsers() {
  if (!PRIVATE_KEY) {
    console.error('Please set PRIVATE_KEY in .env.local');
    return;
  }

  const account = privateKeyToAccount(PRIVATE_KEY);
  
  const walletClient = createWalletClient({
    account,
    chain: abstractTestnet,
    transport: http()
  });

  const publicClient = createPublicClient({
    chain: abstractTestnet,
    transport: http()
  });

  const testUsers = [
    'alice_dev',
    'bob_builder',
    'charlie_coder',
    'dana_designer',
    'eve_engineer'
  ];

  console.log('🚀 Registering test users...\n');

  for (const handle of testUsers) {
    try {
      // Check if already registered
      const handleAddress = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: contractAbi.abi,
        functionName: 'handleToAddress',
        args: [handle]
      });

      if (handleAddress !== '0x0000000000000000000000000000000000000000') {
        console.log(`✅ ${handle} is already registered`);
        continue;
      }

      // Register the user
      console.log(`📝 Registering ${handle}...`);
      
      const { request } = await publicClient.simulateContract({
        address: CONTRACT_ADDRESS,
        abi: contractAbi.abi,
        functionName: 'registerUser',
        args: [handle],
        account
      });

      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });
      
      console.log(`✅ Successfully registered ${handle}`);
    } catch (error: any) {
      if (error.message?.includes('already registered')) {
        console.log(`✅ ${handle} is already registered`);
      } else {
        console.error(`❌ Failed to register ${handle}:`, error.message);
      }
    }
  }

  console.log('\n✨ Test users ready! You can now give kudos to:');
  testUsers.forEach(handle => {
    console.log(`  - @${handle}`);
  });
}

registerTestUsers().catch(console.error);