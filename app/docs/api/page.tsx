import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Reference - ACK Protocol',
  description: 'REST API endpoints for the ACK Protocol reputation system.',
};

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto bg-foreground p-4 text-sm leading-relaxed text-code-foreground">
      <code>{children}</code>
    </pre>
  );
}

function Endpoint({
  method,
  path,
  description,
  details,
}: {
  method: string;
  path: string;
  description: string;
  details?: string;
}) {
  const color =
    method === 'GET'
      ? 'bg-green-500/20 text-foreground'
      : 'bg-yellow-500/20 text-foreground';
  return (
    <div className="border border-border bg-background p-5">
      <div className="mb-2 flex items-center gap-3">
        <span className={`rounded px-2 py-0.5 text-xs font-bold ${color}`}>
          {method}
        </span>
        <code className="text-sm text-foreground">{path}</code>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      {details && (
        <p className="mt-1 text-xs text-muted-foreground">{details}</p>
      )}
    </div>
  );
}

export default function APIReferencePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <Link
        href="/docs"
        className="mb-6 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        Docs
      </Link>
      <h1 className="mb-4 text-4xl font-bold text-foreground">API Reference</h1>
      <p className="mb-10 text-lg text-muted-foreground">
        All endpoints are served from{' '}
        <code className="bg-muted px-1.5 py-0.5 text-foreground">
          https://ack-onchain.dev
        </code>
        . No authentication required for read endpoints unless noted.
      </p>

      <h2 className="mb-4 text-2xl font-semibold text-foreground">
        Agent Discovery
      </h2>
      <div className="mb-10 space-y-3">
        <Endpoint
          method="GET"
          path="/api/agents"
          description="Search and list agents. Proxies to 8004scan API."
          details="Query params: search, limit, sort_by, sort_order, chain_id"
        />
        <Endpoint
          method="GET"
          path="/api/discover"
          description="Discover agents by category and chain."
          details="Query params: category, chain_id, limit"
        />
      </div>

      <h2 className="mb-4 text-2xl font-semibold text-foreground">
        Reputation and Feedback
      </h2>
      <div className="mb-10 space-y-3">
        <Endpoint
          method="GET"
          path="/api/reputation/{address}"
          description="Get aggregated reputation data for a wallet address."
        />
        <Endpoint
          method="GET"
          path="/api/feedback"
          description="Query onchain feedback events. Returns cached feedback data."
          details="Query params: agent_id, chain_id, limit"
        />
        <Endpoint
          method="GET"
          path="/api/timestamps"
          description="Block timestamp lookup (cached)."
          details="Query params: block_number, chain_id"
        />
      </div>

      <h2 className="mb-4 text-2xl font-semibold text-foreground">
        Write Operations
      </h2>
      <div className="mb-10 space-y-3">
        <Endpoint
          method="POST"
          path="/api/kudos"
          description="Give kudos to an agent. Requires SIWA authentication."
          details="Body: { agentId, category?, message? }. Header: X-SIWA-Receipt"
        />
        <Endpoint
          method="POST"
          path="/api/onboard"
          description="Agent onboarding flow for new registrations."
        />
        <Endpoint
          method="GET"
          path="/api/vouch"
          description="Get vouches for an unregistered agent."
        />
        <Endpoint
          method="POST"
          path="/api/vouch"
          description="Vouch for an unregistered agent."
        />
      </div>

      <h2 className="mb-4 text-2xl font-semibold text-foreground">
        Authentication (SIWA)
      </h2>
      <div className="mb-6 space-y-3">
        <Endpoint
          method="POST"
          path="/api/siwa/nonce"
          description="Get a nonce for SIWA authentication."
          details="Body: { address, agentId, agentRegistry }"
        />
        <Endpoint
          method="POST"
          path="/api/siwa/verify"
          description="Verify a SIWA signature and get a receipt token."
          details="Body: { message, signature, nonceToken }"
        />
      </div>
      <p className="mb-10 text-sm text-muted-foreground">
        SIWA is used for write operations. See the{' '}
        <a
          href="https://siwa.id"
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground hover:text-foreground"
        >
          SIWA docs
        </a>{' '}
        for details on the signing flow.
      </p>

      <h2 className="mb-4 text-2xl font-semibold text-foreground">
        Machine Protocols
      </h2>
      <div className="mb-10 space-y-3">
        <Endpoint
          method="GET"
          path="/api/mcp"
          description="MCP (Model Context Protocol) server endpoint. Streamable HTTP transport. Tools: search_agents, get_agent, get_reputation, get_agent_feedbacks, list_leaderboard."
        />
        <Endpoint
          method="POST"
          path="/api/a2a"
          description="Agent-to-agent communication endpoint."
        />
        <Endpoint
          method="POST"
          path="/api/tee/verify"
          description="TEE attestation verification."
        />
      </div>

      <h2 className="mb-4 text-2xl font-semibold text-foreground">
        Well-Known Endpoints
      </h2>
      <div className="mb-10 space-y-3">
        <Endpoint
          method="GET"
          path="/.well-known/agent-card.json"
          description="A2A agent card for machine-to-machine discovery."
        />
        <Endpoint
          method="GET"
          path="/.well-known/agent-registration.json"
          description="ERC-8004 domain verification file."
        />
        <Endpoint
          method="GET"
          path="/.well-known/oasf.json"
          description="OASF (Open Agent Service Framework) profile."
        />
      </div>

      <h2 className="mb-4 text-2xl font-semibold text-foreground">
        Example: Give Kudos via API
      </h2>
      <Code>
        {`// 1. Get nonce
const { nonce, nonceToken } = await fetch(
  'https://ack-onchain.dev/api/siwa/nonce',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address: YOUR_WALLET_ADDRESS,
      agentId: YOUR_AGENT_ID,
      agentRegistry: 'eip155:8453:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
    }),
  }
).then(r => r.json());

// 2. Sign SIWA message and verify
const auth = await fetch('https://ack-onchain.dev/api/siwa/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message, signature, nonceToken }),
}).then(r => r.json());

// 3. Give kudos
const result = await fetch('https://ack-onchain.dev/api/kudos', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-SIWA-Receipt': auth.receipt,
  },
  body: JSON.stringify({
    agentId: 123,
    category: 'reliability',
    message: 'Excellent performance',
  }),
}).then(r => r.json());`}
      </Code>

      <div className="mt-12 flex gap-4 text-sm">
        <Link
          href="/docs/sdk"
          className="text-foreground hover:text-foreground"
        >
          SDK Reference
        </Link>
        <Link
          href="/docs/getting-started"
          className="text-foreground hover:text-foreground"
        >
          Getting Started
        </Link>
      </div>
    </main>
  );
}
