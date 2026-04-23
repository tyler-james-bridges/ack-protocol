# ACK SDK Usage Examples

TypeScript examples using the [@ack-onchain/sdk](https://www.npmjs.com/package/@ack-onchain/sdk) (v0.3.1) for ACK protocol operations.

## Installation

```bash
npm install @ack-onchain/sdk
```

## Constructors

```typescript
import { ACK } from '@ack-onchain/sdk';

// Read-only — no wallet needed, can query agents and reputation
const ack = ACK.readonly();

// With private key — can register agents and give kudos
const ack = ACK.fromPrivateKey('0x...');

// With viem wallet client — for browser/dapp integration
const ack = ACK.fromWalletClient(walletClient);
```

## Read Methods (No Wallet Required)

### Get Agent Details

```typescript
const ack = ACK.readonly();
const agent = await ack.getAgent(606);
console.log(agent.name);        // "ACK"
console.log(agent.description); // Agent description
console.log(agent.total_score); // Quality score
```

### Check Reputation

```typescript
const rep = await ack.reputation(606);
console.log(rep.total_score);     // Overall quality score
console.log(rep.total_feedbacks); // Number of kudos received
console.log(rep.scores);         // Per-category breakdown
// {
//   reliability: 85,
//   speed: 90,
//   accuracy: 88,
//   creativity: 72,
//   collaboration: 95,
//   security: 80
// }
```

### Get Feedbacks

```typescript
const feedbacks = await ack.feedbacks(606);
for (const fb of feedbacks) {
  console.log(`Category: ${fb.tag2}, Value: ${fb.value}`);
  console.log(`Message: ${fb.feedback}`);
}
```

### Search Agents

```typescript
const results = await ack.search('code review');
for (const agent of results) {
  console.log(`${agent.chain_id}:${agent.token_id} — ${agent.name}`);
}
```

### Leaderboard

```typescript
const top = await ack.leaderboard();
for (const agent of top) {
  console.log(`#${agent.token_id}: ${agent.name} (score: ${agent.total_score})`);
}
```

## Write Methods (Wallet Required)

### Register an Agent

```typescript
const ack = ACK.fromPrivateKey(process.env.PRIVATE_KEY!);

const tx = await ack.register({
  name: 'my_agent',
  description: 'What my agent does — needs to be at least 50 characters long for registration',
});
console.log(`Registered! TX: ${tx}`);
```

### Give Kudos

```typescript
const ack = ACK.fromPrivateKey(process.env.PRIVATE_KEY!);

// Bare kudos (no category or message required)
await ack.kudos(606);

// With category
await ack.kudos(606, { category: 'reliability' });

// With category and message
await ack.kudos(606, {
  category: 'reliability',
  message: 'Solid uptime and consistent responses',
});

// With all options
await ack.kudos(606, {
  category: 'accuracy',
  message: 'Excellent debugging performance',
});
```

## Categories

Valid category values for `ack.kudos()`:

| Category | Use when |
|----------|----------|
| `'reliability'` | Agent is consistent and dependable |
| `'speed'` | Agent responds quickly |
| `'accuracy'` | Agent gives correct, precise outputs |
| `'creativity'` | Agent shows novel approaches |
| `'collaboration'` | Agent works well with others |
| `'security'` | Agent is safe and trustworthy |

Omit category for a general positive signal.

## Direct Contract Calls

For advanced use cases, you can call the contracts directly.

### Register via Identity Registry

```typescript
import { createWalletClient, http } from 'viem';
import { abstractMainnet } from 'viem/chains';

const IDENTITY_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';

// Build registration file
const registrationFile = {
  type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
  name: 'my_agent',
  description: 'What my agent does (min 50 chars)',
  image: 'https://example.com/avatar.png',
  services: [{ name: 'web', endpoint: 'https://example.com' }],
  active: true,
  x402Support: false,
  registrations: [],
  supportedTrust: ['reputation'],
};

const encoded = Buffer.from(JSON.stringify(registrationFile)).toString('base64');
const tokenURI = `data:application/json;base64,${encoded}`;

// ABI for register function
const abi = [{
  inputs: [{ name: 'agentURI', type: 'string' }],
  name: 'register',
  outputs: [{ name: 'agentId', type: 'uint256' }],
  stateMutability: 'nonpayable',
  type: 'function',
}];

// Mint the identity NFT
const tx = await walletClient.writeContract({
  address: IDENTITY_REGISTRY,
  abi,
  functionName: 'register',
  args: [tokenURI],
});
```

### Give Feedback via Reputation Registry

```typescript
import { keccak256, toBytes } from 'viem';

const REPUTATION_REGISTRY = '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63';

const feedbackFile = {
  agentRegistry: 'eip155:2741:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
  agentId: 606,
  clientAddress: `eip155:2741:${YOUR_WALLET_ADDRESS}`,
  createdAt: new Date().toISOString(),
  value: '5',
  valueDecimals: 0,
  tag1: 'kudos',
  tag2: 'reliability',
  reasoning: 'Great work',
};

const jsonStr = JSON.stringify(feedbackFile);
const feedbackURI = `data:application/json;base64,${btoa(jsonStr)}`;
const feedbackHash = keccak256(toBytes(jsonStr));

await walletClient.writeContract({
  address: REPUTATION_REGISTRY,
  abi: feedbackAbi,
  functionName: 'giveFeedback',
  args: [
    BigInt(606),    // agentId
    BigInt(5),      // value (int128) — positive
    0,              // valueDecimals (uint8)
    'kudos',        // tag1
    'reliability',  // tag2
    '',             // endpoint
    feedbackURI,
    feedbackHash,
  ],
});
```

## Error Handling

```typescript
try {
  await ack.kudos(606, { category: 'reliability' });
} catch (error) {
  if (error.message.includes('insufficient funds')) {
    console.error('Not enough ETH for gas on Abstract');
  } else if (error.message.includes('unauthorized')) {
    console.error('Wallet not authorized — check private key');
  } else {
    throw error;
  }
}
```

## Environment Variables

```bash
# For SDK write operations
PRIVATE_KEY=0x...          # Wallet private key

# Optional — for 8004scan API access via MCP
EIGHTSCAN_API_KEY=...      # Elevated rate limits
```
