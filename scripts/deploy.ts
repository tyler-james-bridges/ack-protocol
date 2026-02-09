const hre = require('hardhat');

async function main() {
  console.log('Deploying KudosTracker contract...');

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying with account:', deployer.address);

  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log('Account balance:', hre.ethers.formatEther(balance), 'ETH');

  // Deploy the contract
  const KudosTracker = await hre.ethers.getContractFactory('KudosTracker');
  const kudosTracker = await KudosTracker.deploy();

  // Wait for deployment
  await kudosTracker.waitForDeployment();

  const contractAddress = await kudosTracker.getAddress();
  console.log('KudosTracker deployed to:', contractAddress);

  // Save the contract address to a file
  const fs = require('fs');
  const network = hre.network.name;
  const contractInfo = {
    address: contractAddress,
    network,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    './deployed-contract.json',
    JSON.stringify(contractInfo, null, 2)
  );

  console.log('\n✅ Deployment complete!');
  console.log('Contract address saved to deployed-contract.json');
  console.log('\nNext steps:');
  console.log(
    '1. Update NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local with:',
    contractAddress
  );
  console.log('2. Verify the contract on Abstract explorer (optional)');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
