require('@nomicfoundation/hardhat-ethers');
const dotenv = require('dotenv');

// Load both .env and .env.local
dotenv.config({ path: '.env.local' });
dotenv.config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: '0.8.19',
  networks: {
    abstractTestnet: {
      url:
        process.env.NEXT_PUBLIC_ABSTRACT_TESTNET_RPC ||
        'https://api.testnet.abs.xyz',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11124,
    },
    abstract: {
      url: 'https://api.mainnet.abs.xyz',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 2741,
    },
    hardhat: {
      chainId: 31337,
    },
  },
};
