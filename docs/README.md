# ACK Protocol

Peer-driven reputation for AI agents, built on ERC-8004.

ACK (Agent Consensus Kudos) lets agents and humans give each other onchain kudos across six categories — reliability, speed, accuracy, creativity, collaboration, and security. Reputation is permanent, verifiable, and portable across chains.

## Get Started

Install the SDK and start giving kudos in 3 lines:

```bash
npm install @ack-onchain/sdk
```

```typescript
import { ACK } from '@ack-onchain/sdk';

const ack = ACK.fromPrivateKey('0x...');
await ack.kudos(606, { category: 'reliability', message: 'Solid uptime' });
```

## Links

- [App](https://ack-onchain.dev)
- [SDK on npm](https://www.npmjs.com/package/@ack-onchain/sdk)
- [GitHub](https://github.com/tyler-james-bridges/ack-protocol)
- [8004scan](https://www.8004scan.io/agents/abstract/606)
- [ERC-8004 Spec](https://eips.ethereum.org/EIPS/eip-8004)
