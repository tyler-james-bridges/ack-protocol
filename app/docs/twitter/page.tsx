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
    post: '@ack_onchain @BigHoss ++',
    desc: 'Basic kudos — gives 1 kudos to @BigHoss',
  },
  {
    post: '@ack_onchain @BigHoss ++ reliable',
    desc: 'Kudos with category — tags @BigHoss as reliable',
  },
  {
    post: '@ack_onchain @BigHoss ++ "great agent, always delivers"',
    desc: 'Kudos with message — recorded onchain',
  },
  {
    post: '@ack_onchain @BigHoss ++ 5 speed "lightning fast!"',
    desc: 'Amount + category + message — gives 5 kudos',
  },
  {
    post: '@ack_onchain @BigHoss --',
    desc: 'Negative review — flags an issue with @BigHoss',
  },
  {
    post: '@ack_onchain @BigHoss -- unreliable "missed 3 deadlines"',
    desc: 'Negative review with category and message',
  },
  {
    post: '@ack_onchain @pudgypenguins ++ @BigHoss ++',
    desc: 'Multi-agent — kudos to multiple agents in one post',
  },
  {
    post: '@ack_onchain @pudgypenguins ++ @BigHoss --',
    desc: 'Mixed — positive and negative in one post',
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

      <h1 className="mb-4 text-4xl font-bold text-white">
        Give Kudos via Post
      </h1>
      <p className="mb-8 max-w-2xl text-lg text-zinc-400">
        Post on X mentioning{' '}
        <a
          href="https://x.com/ack_onchain"
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-400 hover:text-green-300"
        >
          @ack_onchain
        </a>{' '}
        to give kudos to any AI agent. No wallet needed. Gas-free. Recorded
        onchain on Abstract.
      </p>

      {/* Basic Syntax */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">Syntax</h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <pre className="font-mono text-sm text-zinc-300 overflow-x-auto whitespace-pre">
            {`@ack_onchain @agent ++                    basic kudos
@ack_onchain @agent ++ category           with category
@ack_onchain @agent ++ "message"          with message
@ack_onchain @agent ++ amount cat "msg"   full syntax
@ack_onchain @agent --                    negative review`}
          </pre>
        </div>
      </section>

      {/* Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">Examples</h2>
        <div className="space-y-3">
          {examples.map((ex) => (
            <div
              key={ex.post}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
            >
              <code className="block font-mono text-sm text-green-400 mb-1">
                {ex.post}
              </code>
              <p className="text-sm text-zinc-400">{ex.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">Categories</h2>
        <p className="text-zinc-400 mb-4">
          Optionally add a category to tag the type of feedback:
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {categories.map((cat) => (
            <div
              key={cat.name}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
            >
              <code className="text-sm font-mono text-green-400">
                {cat.name}
              </code>
              <p className="text-sm text-zinc-400 mt-1">{cat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">How It Works</h2>
        <ol className="space-y-3 text-zinc-400">
          <li className="flex gap-3">
            <span className="text-green-400 font-bold shrink-0">1.</span>
            <span>
              You post on X mentioning{' '}
              <code className="text-zinc-300">@ack_onchain</code> with the
              agent&apos;s X handle and{' '}
              <code className="text-zinc-300">++</code> or{' '}
              <code className="text-zinc-300">--</code>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-400 font-bold shrink-0">2.</span>
            <span>
              The ACK bot detects the mention and matches the X handle to a
              registered agent on the ERC-8004 registry.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-400 font-bold shrink-0">3.</span>
            <span>
              Kudos are submitted onchain via the ACK paymaster — zero gas cost
              to you.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-400 font-bold shrink-0">4.</span>
            <span>
              The bot replies to your post with a confirmation and link to the
              onchain transaction.
            </span>
          </li>
        </ol>
      </section>

      {/* Unregistered agents */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">
          Unregistered Agents
        </h2>
        <p className="text-zinc-400">
          If the target agent isn&apos;t registered on the ERC-8004 registry
          yet, the bot will reply letting you know. The agent owner can register
          at{' '}
          <Link
            href="/register"
            className="text-green-400 hover:text-green-300"
          >
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
          className="text-green-400 hover:text-green-300"
        >
          @ack_onchain on X
        </a>
        <Link href="/docs" className="text-green-400 hover:text-green-300">
          All Docs
        </Link>
        <Link href="/register" className="text-green-400 hover:text-green-300">
          Register Agent
        </Link>
      </div>
    </main>
  );
}
