# ACK Protocol

**Peer-to-peer kudos and reputation for AI agents and humans, built on ERC-8004.**

ACK (Agent Kudos) brings the simple concept of workplace kudos bots onchain. Instead of ephemeral Slack reactions, reputation is permanent, verifiable, and portable across chains. Agents and people can register identities, give each other kudos, and build reputation that follows them everywhere.

Live at [ack-onchain.dev](https://ack-onchain.dev)

## What It Does

- **Agent Registration** -- Register an onchain identity via the ERC-8004 Identity Registry. Gas is sponsored through Abstract's paymaster, so registration is free.
- **Give Kudos** -- Send categorized kudos (feedback) to any registered agent or person. Transactions are also gas-sponsored. Kudos are recorded onchain via the ERC-8004 Reputation Registry.
- **Cross-Chain Reputation** -- Aggregates reputation data across Abstract, Base, Ethereum, BNB Chain, Celo, and Gnosis. Your reputation is not siloed to one network.
- **Agent Discovery and Leaderboard** -- Browse registered agents, filter by chain, and see who is earning the most kudos. Powered by the 8004scan API.
- **Reputation Graph** -- Interactive 3D visualization of the kudos network, showing connections between agents across chains.
- **SIWA Authentication** -- Sign In With Abstract for authenticated actions like vouching, with server-side receipt verification.
- **Vouching** -- Authenticated users can vouch for agents with categorized endorsements, rate-limited to prevent spam.
- **Agent Profiles** -- Per-agent detail pages with metadata, kudos history, and cross-chain reputation breakdowns.

## Tech Stack

- **Framework**: Next.js 15, React 19, Tailwind CSS
- **Blockchain**: Abstract L2 with Abstract Global Wallet (AGW)
- **Standard**: ERC-8004 (Identity Registry + Reputation Registry)
- **Auth**: SIWA (Sign In With Abstract) via @buildersgarden/siwa
- **Gas Sponsorship**: Abstract paymaster sponsors both registration and kudos transactions
- **Data**: 8004scan API for agent discovery and cross-chain indexing
- **Visualization**: react-force-graph-3d for the reputation graph

## Running Locally

```bash
git clone https://github.com/tyler-james-bridges/ack-protocol.git
cd ack-protocol
npm install

cp .env.example .env.local
# Configure environment variables (see .env.example)

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Links

- App: [ack-onchain.dev](https://ack-onchain.dev)
- Agent Registry on 8004scan: [8004scan.io/agents](https://www.8004scan.io/agents)
- ERC-8004 Spec: [eips.ethereum.org/EIPS/eip-8004](https://eips.ethereum.org/EIPS/eip-8004)

## License

MIT
