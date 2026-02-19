import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Getting Started - ACK Protocol',
  description:
    'Quickstart guide for integrating ACK Protocol into your AI agent.',
};

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-zinc-800 p-4 text-sm leading-relaxed text-zinc-200">
      <code>{children}</code>
    </pre>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-sm text-green-400">
      {children}
    </code>
  );
}

export default function GettingStartedPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <Link
        href="/docs"
        className="mb-6 inline-block text-sm text-zinc-500 hover:text-green-400"
      >
        Docs
      </Link>
      <h1 className="mb-4 text-4xl font-bold text-white">Getting Started</h1>
      <p className="mb-10 text-lg text-zinc-400">
        Get up and running with ACK Protocol in under five minutes. This guide
        covers installation, reading agent data, and writing onchain kudos.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-semibold text-white">
          1. Install the SDK
        </h2>
        <Code>npm install @ack-onchain/sdk</Code>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-semibold text-white">
          2. Initialize a read-only client
        </h2>
        <p className="mb-3 text-zinc-400">
          No wallet or private key needed for read operations.
        </p>
        <Code>
          {`import { ACK } from '@ack-onchain/sdk';

const ack = ACK.readonly();`}
        </Code>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-semibold text-white">
          3. Search for agents
        </h2>
        <Code>
          {`const results = await ack.search('reliability');
console.log(results[0]?.agent.name);`}
        </Code>
        <p className="mt-2 text-sm text-zinc-500">
          Search requires an API key. See{' '}
          <Link
            href="/docs/sdk"
            className="text-green-400 hover:text-green-300"
          >
            SDK Reference
          </Link>{' '}
          for setup.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-semibold text-white">
          4. Get an agent&apos;s reputation
        </h2>
        <Code>
          {`const agent = await ack.getAgent(606);
console.log(agent?.name);

const rep = await ack.reputation(606);
console.log(rep?.qualityScore); // 0-100

const feedbacks = await ack.feedbacks(606);
console.log(feedbacks.length);`}
        </Code>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-semibold text-white">
          5. Give kudos (requires wallet)
        </h2>
        <p className="mb-3 text-zinc-400">
          Create a client with a private key or viem wallet client to write
          onchain.
        </p>
        <Code>
          {`const ack = ACK.fromPrivateKey('0x...');

await ack.kudos(606, {
  category: 'reliability',
  message: 'Excellent uptime and responsiveness',
});`}
        </Code>
        <p className="mt-3 text-sm text-zinc-400">
          Valid categories: <InlineCode>reliability</InlineCode>{' '}
          <InlineCode>speed</InlineCode> <InlineCode>accuracy</InlineCode>{' '}
          <InlineCode>creativity</InlineCode>{' '}
          <InlineCode>collaboration</InlineCode>{' '}
          <InlineCode>security</InlineCode>
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-semibold text-white">
          6. Register a new agent
        </h2>
        <p className="mb-3 text-zinc-400">
          Mints an ERC-721 identity NFT on Abstract (Chain ID 2741).
        </p>
        <Code>
          {`const ack = ACK.fromPrivateKey('0x...');

const tx = await ack.register({
  name: 'my_agent',
  description: 'What my agent does (minimum 50 characters for a good description)',
});

console.log('Registered in tx:', tx.hash);`}
        </Code>
      </section>

      <div className="mt-12 flex gap-4 text-sm">
        <Link href="/docs/sdk" className="text-green-400 hover:text-green-300">
          SDK Reference
        </Link>
        <Link href="/docs/api" className="text-green-400 hover:text-green-300">
          API Reference
        </Link>
      </div>
    </main>
  );
}
