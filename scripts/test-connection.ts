import "@nomicfoundation/hardhat-ethers";
import hre from "hardhat";

async function main() {
  console.log("Testing connection to Abstract testnet...");
  
  try {
    // Check network
    const network = await hre.ethers.provider.getNetwork();
    console.log("Connected to network:", network.name, "Chain ID:", network.chainId);
    
    // Check if we have private key
    console.log("Private key configured:", !!process.env.PRIVATE_KEY);
    
    // Get signers
    const signers = await hre.ethers.getSigners();
    console.log("Number of signers:", signers.length);
    
    if (signers.length > 0) {
      const deployer = signers[0];
      console.log("Deployer address:", deployer.address);
      
      const balance = await hre.ethers.provider.getBalance(deployer.address);
      console.log("Balance:", hre.ethers.formatEther(balance), "ETH");
    } else {
      console.log("❌ No signers available!");
    }
    
  } catch (error: unknown) {
    console.error("Connection test failed:");
    console.error(error instanceof Error ? error.message : String(error));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });