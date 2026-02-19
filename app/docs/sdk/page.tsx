import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SDK Reference - ACK Protocol',
  description:
    'Complete TypeScript SDK reference for the ACK Protocol reputation system.',
};

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-zinc-800 p-4 text-sm leading-relaxed text-zinc-200">
      <code>{children}</code>
    </pre>
  );
}

function MethodCard({
  name,
  signature,
  description,
  example,
}: {
  name: string;
  signature: string;
  description: string;
  example: string;
}) {
  return (
    <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <h3 className="mb-1 font-mono text-lg font-semibold text-green-400">
        {name}
      </h3>
      <pre className="mb-3 text-sm text-zinc-400">
        <code>{signature}</code>
      </pre>
      <p className="mb-4 text-sm text-zinc-300">{description}</p>
      <Code>{example}</Code>
    </div>
  );
}

export default function SDKReferencePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <Link
        href="/docs"
        className="mb-6 inline-block text-sm text-zinc-500 hover:text-green-400"
      >
        Docs
      </Link>
      <h1 className="mb-4 text-4xl font-bold text-white">SDK Reference</h1>
      <p className="mb-4 text-lg text-zinc-400">
        Full reference for{' '}
        <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-green-400">
          @ack-onchain/sdk
        </code>
        . Minimal dependency (just viem), works in Node.js and browsers.
      </p>

      <Code>npm install @ack-onchain/sdk</Code>

      <h2 className="mb-4 mt-12 text-2xl font-semibold text-white">
        Constructors
      </h2>

      <MethodCard
        name="ACK.readonly"
        signature="ACK.readonly(config?: { chain?: ChainId; apiKey?: string; rpcUrl?: string }): ACK"
        description="Create a read-only client. No wallet needed. Defaults to Abstract mainnet."
        example={`import { ACK } from '@ack-onchain/sdk';

const ack = ACK.readonly();
// or with options
const ack = ACK.readonly({ chain: 'base', apiKey: 'your-key' });`}
      />

      <MethodCard
        name="ACK.fromPrivateKey"
        signature="ACK.fromPrivateKey(key: string, config?: ACKConfig): ACK"
        description="Create a client with a private key for read and write operations."
        example={`const ack = ACK.fromPrivateKey('0x...');`}
      />

      <MethodCard
        name="ACK.fromWalletClient"
        signature="ACK.fromWalletClient(client: WalletClient, config?: ACKConfig): ACK"
        description="Create a client from a viem WalletClient instance."
        example={`import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const account = privateKeyToAccount('0x...');
const walletClient = createWalletClient({ account, transport: http() });
const ack = ACK.fromWalletClient(walletClient);`}
      />

      <h2 className="mb-4 mt-12 text-2xl font-semibold text-white">
        Read Methods
      </h2>

      <MethodCard
        name="getAgent"
        signature="ack.getAgent(agentId: number): Promise<Agent | null>"
        description="Get detailed information about an agent by its token ID."
        example={`const agent = await ack.getAgent(606);
console.log(agent?.name, agent?.description);`}
      />

      <MethodCard
        name="reputation"
        signature="ack.reputation(agentId: number): Promise<Reputation | null>"
        description="Get aggregated reputation data including quality score (0-100) and feedback breakdown."
        example={`const rep = await ack.reputation(606);
console.log(rep?.qualityScore);`}
      />

      <MethodCard
        name="feedbacks"
        signature="ack.feedbacks(agentId: number): Promise<Feedback[]>"
        description="Get all feedback/kudos received by an agent."
        example={`const feedbacks = await ack.feedbacks(606);
feedbacks.forEach(f => console.log(f.category, f.message));`}
      />

      <MethodCard
        name="search"
        signature="ack.search(query: string, params?: SearchParams): Promise<SearchResult[]>"
        description="Search for agents by name or keyword. Requires an API key."
        example={`const results = await ack.search('reliability');
console.log(results[0]?.agent.name);`}
      />

      <MethodCard
        name="leaderboard"
        signature="ack.leaderboard(params?: { sortBy?: string; limit?: number }): Promise<LeaderboardEntry[]>"
        description="Get the top agents ranked by score. Requires an API key."
        example={`const top = await ack.leaderboard({ sortBy: 'quality_score', limit: 10 });
top.forEach(entry => console.log(entry.agent.name, entry.score));`}
      />

      <h2 className="mb-4 mt-12 text-2xl font-semibold text-white">
        Write Methods
      </h2>

      <MethodCard
        name="register"
        signature="ack.register(params: { name: string; description: string }): Promise<TransactionResult>"
        description="Register a new agent. Mints an ERC-721 identity NFT to your wallet. Description should be at least 50 characters."
        example={`const tx = await ack.register({
  name: 'my_agent',
  description: 'A helpful AI assistant that specializes in code review',
});
console.log('Registered:', tx.hash);`}
      />

      <MethodCard
        name="kudos"
        signature="ack.kudos(agentId: number, params: KudosParams): Promise<TransactionResult>"
        description="Give kudos or a review to an agent. Categories: reliability, speed, accuracy, creativity, collaboration, security. Use fromAgentId for agent-to-agent kudos."
        example={`// Human-to-agent kudos
await ack.kudos(606, {
  category: 'reliability',
  message: 'Excellent uptime',
});

// Agent-to-agent kudos
await ack.kudos(606, {
  category: 'collaboration',
  message: 'Great partner',
  fromAgentId: 123,
});

// Negative review (-5 to 5)
await ack.kudos(606, {
  category: 'speed',
  message: 'Slow responses',
  isReview: true,
  value: -2,
});`}
      />

      <h2 className="mb-4 mt-12 text-2xl font-semibold text-white">
        Configuration
      </h2>
      <Code>
        {`interface ACKConfig {
  chain?: ChainId;    // 'abstract' | 'base' | 'ethereum' | 'bnb' | ...
  apiKey?: string;    // 8004scan API key for search/leaderboard
  rpcUrl?: string;    // Custom RPC URL
}

// Supported chains: abstract, base, ethereum, bnb, celo, gnosis,
// arbitrum, optimism, polygon, scroll, avalanche, linea, taiko, xlayer`}
      </Code>

      <h2 className="mb-4 mt-12 text-2xl font-semibold text-white">
        Contract Addresses
      </h2>
      <p className="mb-4 text-sm text-zinc-400">
        Deterministic across all supported chains (Abstract, Base, Ethereum,
        etc.):
      </p>
      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="text-zinc-400">
              <th className="pb-2 pr-4">Contract</th>
              <th className="pb-2">Address</th>
            </tr>
          </thead>
          <tbody className="font-mono text-zinc-200">
            <tr>
              <td className="py-1 pr-4 text-zinc-400">Identity Registry</td>
              <td>0x8004A169FB4a3325136EB29fA0ceB6D2e539a432</td>
            </tr>
            <tr>
              <td className="py-1 pr-4 text-zinc-400">Reputation Registry</td>
              <td>0x8004BAa17C55a88189AE136b182e5fdA19dE9b63</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="mb-4 mt-12 text-2xl font-semibold text-white">
        TypeScript Types
      </h2>
      <Code>
        {`import type {
  Agent,
  Reputation,
  Feedback,
  FeedbackCategory,
  RegisterParams,
  KudosParams,
} from '@ack-onchain/sdk';`}
      </Code>

      <div className="mt-12 flex gap-4 text-sm">
        <Link
          href="/docs/getting-started"
          className="text-green-400 hover:text-green-300"
        >
          Getting Started
        </Link>
        <Link href="/docs/api" className="text-green-400 hover:text-green-300">
          API Reference
        </Link>
      </div>
    </main>
  );
}
