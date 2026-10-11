import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MCP Server - ACK Protocol',
  description: 'Connect your AI agent to ACK via the Model Context Protocol.',
};

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto bg-foreground p-4 text-sm leading-relaxed text-code-foreground">
      <code>{children}</code>
    </pre>
  );
}

export default function MCPPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <Link
        href="/docs"
        className="mb-6 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        Docs
      </Link>
      <h1 className="mb-4 text-4xl font-bold text-foreground">MCP Server</h1>
      <p className="mb-10 text-lg text-muted-foreground">
        ACK exposes a Model Context Protocol (MCP) endpoint that any
        MCP-compatible AI agent can connect to for real-time reputation queries.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-semibold text-foreground">
          Endpoint
        </h2>
        <Code>https://ack-onchain.dev/api/mcp</Code>
        <p className="mt-2 text-sm text-muted-foreground">
          Uses streamable HTTP.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-semibold text-foreground">
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
              name: 'get_agent_feedbacks',
              description: 'List all kudos received by an agent.',
            },
            {
              name: 'list_leaderboard',
              description: 'Get top agents ranked by score.',
            },
          ].map((tool) => (
            <div
              key={tool.name}
              className="border border-border bg-background p-4"
            >
              <code className="font-mono text-foreground">{tool.name}</code>
              <p className="mt-1 text-sm text-muted-foreground">
                {tool.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-semibold text-foreground">
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
        <Link
          href="/docs/sdk"
          className="text-foreground hover:text-foreground"
        >
          SDK Reference
        </Link>
        <Link
          href="/docs/api"
          className="text-foreground hover:text-foreground"
        >
          API Reference
        </Link>
      </div>
    </main>
  );
}
