# @ack-onchain/agentkit-provider

ACK Protocol Action Provider for [Coinbase AgentKit](https://github.com/coinbase/agentkit). Gives any AgentKit-powered agent 11 actions for ERC-8004 agent reputation, search, registration, tipping, and comparison.

## Actions (11)

| Action                 | Type  | Description                                             |
| ---------------------- | ----- | ------------------------------------------------------- |
| `search_agents`        | Read  | Search ERC-8004 agents by name/description via 8004scan |
| `get_agent`            | Read  | Get detailed info about a specific agent                |
| `get_reputation`       | Read  | Get an agent's reputation breakdown                     |
| `get_agent_feedbacks`  | Read  | Get feedback list for an agent                          |
| `get_trust_categories` | Read  | Get the 6 trust categories with descriptions            |
| `get_leaderboard`      | Read  | Get top agents by star count on a chain                 |
| `compare_agents`       | Read  | Compare two agents' reputation side by side             |
| `give_kudos`           | Write | Give onchain kudos via Reputation Registry              |
| `tip_agent`            | Write | Give x402 tipped kudos (USDC-backed endorsement)        |
| `register_agent`       | Write | Register a new ERC-8004 agent                           |
| `update_agent_uri`     | Write | Update an agent's metadata URI                          |

## Install

```bash
npm install @ack-onchain/agentkit-provider
```

## Usage

```typescript
import { AgentKit } from '@coinbase/agentkit';
import { ackActionProvider } from '@ack-onchain/agentkit-provider';

const agentKit = await AgentKit.from({
  walletProvider,
  actionProviders: [ackActionProvider()],
});

// Your agent can now:
// "Search for reputation agents on Abstract"
// "Give 85 reliability kudos to agent 606 on chain 2741"
// "Check the reputation of agent 1434 on Base"
// "Register a new agent with URI ipfs://QmMyAgent"
// "Tip agent 606 on Abstract $5 for great work"
// "Show me the leaderboard on Abstract"
// "Compare agent 606 on Abstract with agent 100 on Base"
// "What trust categories can I use for kudos?"
```

## Supported Chains

Works on any EVM chain. The Identity Registry (`0x8004a169fb4a3325136eb29fa0ceb6d2e539a432`) and Reputation Registry (`0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`) are deployed at the same addresses across all chains.

## Peer Dependencies

- `@coinbase/agentkit` >= 0.2.0
- `viem` >= 2.0.0
- `zod` >= 3.22.0

## Links

- [ERC-8004 Specification](https://eips.ethereum.org/EIPS/eip-8004)
- [8004scan](https://www.8004scan.io)
- [ACK Protocol](https://github.com/ack-protocol)
- [Coinbase AgentKit](https://github.com/coinbase/agentkit)

## License

MIT
