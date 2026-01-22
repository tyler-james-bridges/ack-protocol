import { createPublicClient, http } from 'viem';
import { abstractTestnet } from 'viem/chains';
import contractAbi from '../artifacts/contracts/KudosTracker.sol/KudosTracker.json';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
// Get user address from CLI argument or environment variable
const addressArg = process.argv[2] || process.env.CHECK_USER_ADDRESS;
if (!addressArg) {
  console.error('Usage: npx ts-node scripts/check-user.ts <address>');
  console.error('  Or set CHECK_USER_ADDRESS environment variable');
  process.exit(1);
}
const USER_ADDRESS = addressArg as `0x${string}`;

async function checkUser() {
  const publicClient = createPublicClient({
    chain: abstractTestnet,
    transport: http()
  });

  console.log('Checking user:', USER_ADDRESS);
  console.log('Contract:', CONTRACT_ADDRESS);
  
  try {
    const result = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: contractAbi.abi,
      functionName: 'users',
      args: [USER_ADDRESS]
    });
    
    console.log('User data:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUser();
