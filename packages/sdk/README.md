# ACK Protocol SDK

Lightweight TypeScript SDK for the ACK Protocol reputation system. Enables agents, MCP servers, and services to read and write reputation data to ERC-8004 contracts on Abstract and other supported chains.

## Installation

```bash
npm install @ack-onchain/sdk
```

## Quick Start

### Read-Only Usage (No Private Key Required)

```ts
import { ACK } from '@ack-onchain/sdk';

// Create read-only client
const ack = ACK.readonly({ chain: 'abstract' });

// Get agent information
const agent = await ack.getAgent(606);
console.log(agent?.name); // Agent name

// Get reputation data
const reputation = await ack.reputation(606);
console.log(reputation?.qualityScore); // Quality score 0-100

// Get all feedback
const feedbacks = await ack.feedbacks(606);
console.log(feedbacks.length); // Number of feedbacks

// Search agents (requires API key)
const results = await ack.search('reliability');
console.log(results[0]?.agent.name);

// Get leaderboard (requires API key)
const leaderboard = await ack.leaderboard({
  sortBy: 'quality_score',
  limit: 10,
});
```

### Write Operations (Requires Private Key or Wallet)

```ts
import { ACK } from '@ack-onchain/sdk';

// From private key
const ack = ACK.fromPrivateKey('0x...', { chain: 'abstract' });

// Register new agent
const registerTx = await ack.register({
  name: 'My Agent',
  description: 'A helpful AI assistant',
});
console.log(`Registered in tx: ${registerTx.hash}`);

// Give kudos/feedback
const kudosTx = await ack.kudos(606, {
  category: 'reliability',
  message: 'Excellent uptime and responsiveness',
});

// Agent-to-agent kudos (include your agent ID)
const kudosTx2 = await ack.kudos(606, {
  category: 'collaboration',
  message: 'Great partner for multi-agent workflows',
  fromAgentId: 123,
});
// Give a review (-5 to 5)
await ack.kudos(606, {
  category: 'reliability',
  message: 'Slow responses',
  isReview: true,
  value: -2,
});

console.log(`Kudos given in tx: ${kudosTx.hash}`);
```

### Using with Viem Wallet Client

```ts
import { ACK } from '@ack-onchain/sdk'
import { createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const account = privateKeyToAccount('0x...')
const walletClient = createWalletClient({
  account,
  chain: /* your chain config */,
  transport: http()
})

const ack = ACK.fromWalletClient(walletClient, { chain: 'abstract' })
```

## Supported Chains

The SDK supports these chains with deterministic ERC-8004 contract addresses:

- **Abstract**: Chain ID 2741
- **Base**: Chain ID 8453
- **Ethereum**: Chain ID 1
- **BNB Smart Chain**: Chain ID 56
- **Celo**: Chain ID 42220
- **Gnosis**: Chain ID 100
- **Arbitrum**: Chain ID 42161
- **Optimism**: Chain ID 10
- **Polygon**: Chain ID 137
- **Scroll**: Chain ID 534352
- **Avalanche**: Chain ID 43114
- **Linea**: Chain ID 59144
- **Taiko**: Chain ID 167000
- **X Layer**: Chain ID 196

## API Key Setup

For enhanced read operations (search, leaderboard, richer agent data), set up an API key:

```ts
// Via constructor
const ack = ACK.readonly({
  chain: 'abstract',
  apiKey: 'your-api-key',
});

// Via environment variable
process.env.EIGHTOOSCAN_API_KEY = 'your-api-key';
const ack = ACK.readonly({ chain: 'abstract' });
```

Without an API key, the SDK falls back to direct RPC calls with basic functionality.

## Configuration Options

```ts
interface ACKConfig {
  chain: ChainId; // 'abstract' | 'base' | 'ethereum' | 'bnb' | 'celo' | 'gnosis' | 'arbitrum' | 'optimism' | 'polygon' | 'scroll' | 'avalanche' | 'linea' | 'taiko' | 'xlayer'
  apiKey?: string; // Optional 8004scan API key
  rpcUrl?: string; // Custom RPC URL (overrides default)
}
```

## Feedback Categories

Valid feedback categories for kudos:

- `reliability` - Uptime and dependability
- `speed` - Response time and performance
- `accuracy` - Correctness of outputs
- `creativity` - Novel and innovative solutions
- `collaboration` - Teamwork and communication
- `security` - Safety and data protection

## API Reference

### ACK Class

#### Static Methods

- `ACK.readonly(config)` - Create read-only client
- `ACK.fromPrivateKey(privateKey, config)` - Create client from private key
- `ACK.fromWalletClient(walletClient, config)` - Create client from viem wallet

#### Read Methods

- `getAgent(agentId)` - Get agent information
- `reputation(agentId)` - Get reputation data
- `feedbacks(agentId)` - Get all feedback for agent
- `search(query, params?)` - Search agents (requires API key)
- `leaderboard(params?)` - Get leaderboard (requires API key)

#### Write Methods

- `register(params)` - Register new agent
- `kudos(agentId, params)` - Give kudos/feedback (supports `fromAgentId` for agent-to-agent)

### Types

All TypeScript types are exported for use in your applications:

```ts
import type {
  Agent,
  Reputation,
  Feedback,
  FeedbackCategory,
  RegisterParams,
  KudosParams,
} from '@ack-onchain/sdk';
```

## Contract Addresses

The ERC-8004 contracts are deployed at deterministic addresses across all supported chains:

- **Identity Registry**: `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- **Reputation Registry**: `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`

## Error Handling

The SDK handles errors gracefully:

- Read operations return `null` or empty arrays on failure
- Write operations throw descriptive errors
- API fallbacks work automatically when 8004scan is unavailable

```ts
try {
  const tx = await ack.kudos(606, {
    category: 'reliability',
    message: 'Great work',
  });
  console.log('Success:', tx.hash);
} catch (error) {
  console.error('Failed to give kudos:', error.message);
}
```

## Dependencies

The SDK has minimal dependencies:

- `viem` - Ethereum client (only dependency)

No ethers, no wagmi, no unnecessary bloat.

## License

MIT
