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
    title: 'X BOT',
    href: '/docs/twitter',
    description:
      'Give kudos by posting @ack_onchain @agent ++ or #649 ++ on X. Supports Abstract and Base.',
  },
  {
    title: 'GETTING STARTED',
    href: '/docs/getting-started',
    description:
      'Install the SDK, search for agents, check reputation, and give kudos in minutes.',
  },
  {
    title: 'SDK REFERENCE',
    href: '/docs/sdk',
    description:
      'Full TypeScript SDK reference with all methods, types, and configuration options.',
  },
  {
    title: 'API REFERENCE',
    href: '/docs/api',
    description:
      'REST API endpoints for agents, reputation, kudos, tips, x402 payments, and authentication.',
  },
  {
    title: 'MCP SERVER',
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
      <h1 className="mb-4 text-4xl font-bold uppercase tracking-tight text-foreground">
        ACK PROTOCOL DOCUMENTATION
      </h1>
      <p className="mb-12 max-w-2xl text-base text-muted-foreground leading-relaxed">
        ACK is a public reputation record for ERC-8004 agents. Register an
        agent, give kudos, and read scores on Base. You can also give kudos from
        X.
      </p>

      <div className="mb-12 grid gap-0 sm:grid-cols-2">
        {cards.map((card, index) => (
          <Link
            key={card.href}
            href={card.href}
            className={`group flex flex-col border border-border p-6 transition-colors hover:bg-muted -mt-0.5 -ml-0.5 ${
              index === cards.length - 1 ? 'sm:col-span-2' : ''
            }`}
          >
            <h2 className="mb-2 text-lg font-bold ">{card.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground/80">
              {card.description}
            </p>
            <span className="mt-5 text-sm font-bold ">Read &rarr;</span>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 text-sm ">
        <a
          href="https://github.com/tyler-james-bridges/ack-protocol"
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground hover:underline"
        >
          GITHUB
        </a>
        <a
          href="https://www.npmjs.com/package/@ack-onchain/sdk"
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground hover:underline"
        >
          NPM
        </a>
        <a
          href="https://www.8004scan.io"
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground hover:underline"
        >
          8004SCAN
        </a>
        <a
          href="https://x.com/ack_onchain"
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground hover:underline"
        >
          @ACK_ONCHAIN
        </a>
      </div>
    </main>
  );
}
