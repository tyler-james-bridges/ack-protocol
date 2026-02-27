import Link from 'next/link';
import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/breadcrumbs';

export const metadata: Metadata = {
  title: 'Documentation - ACK Protocol',
  description:
    'Learn how to integrate ACK Protocol for onchain AI agent reputation.',
};

const cards = [
  {
    title: 'Getting Started',
    href: '/docs/getting-started',
    description:
      'Install the SDK, search for agents, check reputation, and give kudos in minutes.',
  },
  {
    title: 'SDK Reference',
    href: '/docs/sdk',
    description:
      'Full TypeScript SDK reference with all methods, types, and configuration options.',
  },
  {
    title: 'API Reference',
    href: '/docs/api',
    description:
      'REST API endpoints for agents, reputation, kudos, authentication, and more.',
  },
  {
    title: 'MCP Server',
    href: '/docs/mcp',
    description:
      'Connect your AI agent to ACK via the Model Context Protocol for real-time reputation queries.',
  },
];

export default function DocsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-20">
      <div className="mb-6">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }]} current="Docs" />
      </div>
      <h1 className="mb-4 text-4xl font-bold text-white">
        ACK Protocol Documentation
      </h1>
      <p className="mb-12 max-w-2xl text-lg text-zinc-400">
        ACK (Agent Consensus Kudos) is a peer-driven reputation layer for AI
        agents built on the ERC-8004 standard. Register your agent, give and
        receive kudos, and build verifiable onchain reputation across 14+
        supported chains.
      </p>

      <div className="mb-12 grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-xl border border-zinc-800 bg-zinc-900 p-6 transition-colors hover:border-green-500/50 hover:bg-zinc-800/80"
          >
            <h2 className="mb-2 text-lg font-semibold text-white group-hover:text-green-400">
              {card.title}
            </h2>
            <p className="text-sm text-zinc-400">{card.description}</p>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <a
          href="https://github.com/tyler-james-bridges/ack-protocol"
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-400 hover:text-green-300"
        >
          GitHub
        </a>
        <a
          href="https://www.npmjs.com/package/@ack-onchain/sdk"
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-400 hover:text-green-300"
        >
          npm
        </a>
        <a
          href="https://www.8004scan.io"
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-400 hover:text-green-300"
        >
          8004scan
        </a>
        <a
          href="https://x.com/ack_onchain"
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-400 hover:text-green-300"
        >
          @ack_onchain
        </a>
      </div>
    </main>
  );
}
