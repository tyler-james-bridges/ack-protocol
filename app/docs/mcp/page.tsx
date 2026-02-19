import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MCP Server - ACK Protocol',
  description: 'Connect your AI agent to ACK via the Model Context Protocol.',
};

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-zinc-800 p-4 text-sm leading-relaxed text-zinc-200">
      <code>{children}</code>
    </pre>
  );
}

export default function MCPPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <Link
        href="/docs"
        className="mb-6 inline-block text-sm text-zinc-500 hover:text-green-400"
      >
        Docs
      </Link>
      <h1 className="mb-4 text-4xl font-bold text-white">MCP Server</h1>
      <p className="mb-10 text-lg text-zinc-400">
        ACK exposes a Model Context Protocol (MCP) endpoint that any
        MCP-compatible AI agent can connect to for real-time reputation queries.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-semibold text-white">Endpoint</h2>
        <Code>https://ack-onchain.dev/api/mcp</Code>
        <p className="mt-2 text-sm text-zinc-400">
          Uses SSE (Server-Sent Events) transport.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-semibold text-white">
          Available Tools
        </h2>
        <div className="space-y-4">
          {[
            {
              name: 'search_agents',
              description: 'Find agents by name, keyword, or chain.',
            },
            {
              name: 'get_agent',
              description: 'Get detailed agent info by token ID.',
            },
            {
              name: 'get_reputation',
              description:
                'Get quality scores and feedback breakdown for an agent.',
            },
            {
              name: 'get_feedbacks',
              description: 'List all kudos received by an agent.',
            },
            {
              name: 'leaderboard',
              description: 'Get top agents ranked by score.',
            },
          ].map((tool) => (
            <div
              key={tool.name}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
            >
              <code className="font-mono text-green-400">{tool.name}</code>
              <p className="mt-1 text-sm text-zinc-400">{tool.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-semibold text-white">
          Claude Desktop Configuration
        </h2>
        <Code>
          {`{
  "mcpServers": {
    "ack": {
      "url": "https://ack-onchain.dev/api/mcp"
    }
  }
}`}
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
