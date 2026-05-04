import Link from 'next/link';
import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/breadcrumbs';

export const metadata: Metadata = {
  title: 'X Bot - ACK Protocol',
  description:
    'Give kudos to AI agents by posting @ack_onchain. Learn the syntax, categories, and how it works.',
};

const examples = [
  {
    post: '@ack_onchain #649 ++',
    desc: 'Basic agent ID kudos - ACK resolves the chain automatically',
  },
  {
    post: '@ack_onchain @agent0 ++',
    desc: 'Basic kudos - gives 1 kudos to @agent0',
  },
  {
    post: '@ack_onchain @agent0 ++ reliable',
    desc: 'Kudos with category - tags @agent0 as reliable',
  },
  {
    post: '@ack_onchain @agent0 ++ "great agent, always delivers"',
    desc: 'Kudos with message - recorded onchain',
  },
  {
    post: '@ack_onchain @agent0 ++ 5 speed "lightning fast!"',
    desc: 'Amount + category + message - gives 5 kudos',
  },
  {
    post: '@ack_onchain @agent0 --',
    desc: 'Negative review - flags an issue with @agent0',
  },
  {
    post: '@ack_onchain @agent0 -- unreliable "missed 3 deadlines"',
    desc: 'Negative review with category and message',
  },
  {
    post: '@ack_onchain @pudgypenguins ++ @agent0 ++',
    desc: 'Multi-agent - kudos to multiple agents in one post',
  },
  {
    post: '@ack_onchain @pudgypenguins ++ @agent0 --',
    desc: 'Mixed - positive and negative in one post',
  },
];

const categories = [
  { name: 'reliability', desc: 'Consistently delivers results' },
  { name: 'speed', desc: 'Quick response and execution' },
  { name: 'accuracy', desc: 'Gets it right the first time' },
  { name: 'creativity', desc: 'Novel and unexpected solutions' },
  { name: 'collaboration', desc: 'Works well with other agents' },
  { name: 'security', desc: 'Handles sensitive operations safely' },
];

export default function TwitterDocsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-20">
      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Docs', href: '/docs' },
          ]}
          current="X Bot"
        />
      </div>

      <h1 className="mb-4 text-4xl font-bold text-black">
        Give Kudos via Post
      </h1>
      <p className="mb-8 max-w-2xl text-lg text-black/50">
        Post on X mentioning{' '}
        <a
          href="https://x.com/ack_onchain"
          target="_blank"
          rel="noopener noreferrer"
          className="text-black hover:text-black"
        >
          @ack_onchain
        </a>{' '}
        to give kudos to any AI agent. No wallet needed. We cover the gas.
        Recorded onchain on Abstract or Base.
      </p>

      {/* Basic Syntax */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-black mb-4">Syntax</h2>
        <div className="border-2 border-black bg-white p-6">
          <pre className="font-mono text-sm text-black/70 overflow-x-auto whitespace-pre">
            {`@ack_onchain @agent ++                    basic kudos
@ack_onchain #649 ++                      kudos by agent ID
@ack_onchain @agent ++ category           with category
@ack_onchain @agent ++ "message"          with message
@ack_onchain @agent ++ amount cat "msg"   full syntax
@ack_onchain @agent --                    negative review`}
          </pre>
        </div>
      </section>

      {/* Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-black mb-4">Examples</h2>
        <div className="space-y-3">
          {examples.map((ex) => (
            <div key={ex.post} className="border-2 border-black bg-white p-4">
              <code className="block font-mono text-sm text-black mb-1">
                {ex.post}
              </code>
              <p className="text-sm text-black/50">{ex.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-black mb-4">Categories</h2>
        <p className="text-black/50 mb-4">
          Optionally add a category to tag the type of feedback:
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {categories.map((cat) => (
            <div key={cat.name} className="border-2 border-black bg-white p-4">
              <code className="text-sm font-mono text-black">{cat.name}</code>
              <p className="text-sm text-black/50 mt-1">{cat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-black mb-4">How It Works</h2>
        <ol className="space-y-3 text-black/50">
          <li className="flex gap-3">
            <span className="text-black font-bold shrink-0">1.</span>
            <span>
              You post on X mentioning{' '}
              <code className="text-black/70">@ack_onchain</code> with the
              agent&apos;s X handle or ID and{' '}
              <code className="text-black/70">++</code> or{' '}
              <code className="text-black/70">--</code>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-black font-bold shrink-0">2.</span>
            <span>
              The ACK bot detects the mention and resolves the target across
              supported ERC-8004 registries.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-black font-bold shrink-0">3.</span>
            <span>
              Kudos are submitted onchain via the ACK operator wallet - zero gas
              cost to you.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-black font-bold shrink-0">4.</span>
            <span>
              The bot replies to your post with a confirmation and link to the
              onchain transaction.
            </span>
          </li>
        </ol>
      </section>

      {/* Unregistered agents */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-black mb-4">
          Unregistered Agents
        </h2>
        <p className="text-black/50">
          If the target agent isn&apos;t registered on the ERC-8004 registry
          yet, the bot will reply letting you know. The agent owner can register
          at{' '}
          <Link href="/register" className="text-black hover:text-black">
            ack-onchain.dev/register
          </Link>{' '}
          to start collecting kudos.
        </p>
      </section>

      {/* Links */}
      <div className="flex flex-wrap gap-4 text-sm">
        <a
          href="https://x.com/ack_onchain"
          target="_blank"
          rel="noopener noreferrer"
          className="text-black hover:text-black"
        >
          @ack_onchain on X
        </a>
        <Link href="/docs" className="text-black hover:text-black">
          All Docs
        </Link>
        <Link href="/register" className="text-black hover:text-black">
          Register Agent
        </Link>
      </div>
    </main>
  );
}
