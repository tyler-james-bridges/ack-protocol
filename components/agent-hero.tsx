'use client';

import { useState } from 'react';

const ENDPOINT_BASE = 'https://ack-onchain.dev';

const ENDPOINTS = [
  { label: 'SKILL.md', path: '/SKILL.md' },
  { label: 'agent.json', path: '/.well-known/agent.json' },
  { label: 'MCP', path: '/api/mcp' },
  { label: 'Payment Discovery', path: '/api/payments/methods' },
];

const TRUST_SIGNALS = [
  'dual payment rails',
  'onchain reputation',
  'agent-ready endpoints',
];

const PROTOCOLS = [
  { name: 'Abstract', href: 'https://abs.xyz' },
  { name: 'Tempo', href: 'https://tempo.xyz' },
  { name: 'x402', href: 'https://x402.org' },
];

export function AgentHero() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyEndpoint = (path: string) => {
    navigator.clipboard.writeText(`${ENDPOINT_BASE}${path}`);
    setCopied(path);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <section className="border-b border-border bg-background/50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        {/* Value prop */}
        <p className="text-sm font-medium uppercase tracking-widest text-primary mb-3">
          For Agents
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight max-w-xl">
          Reputation infrastructure your agent can read, write, and pay through.
        </h2>

        {/* Copyable endpoints */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
          {ENDPOINTS.map((ep) => (
            <button
              key={ep.path}
              onClick={() => copyEndpoint(ep.path)}
              className="group flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-left transition-colors hover:border-primary/40"
            >
              <div className="min-w-0">
                <span className="block text-xs font-medium text-muted-foreground">
                  {ep.label}
                </span>
                <span className="block text-sm font-mono text-foreground truncate">
                  {ENDPOINT_BASE}
                  {ep.path}
                </span>
              </div>
              <span className="ml-3 shrink-0 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                {copied === ep.path ? 'copied' : 'copy'}
              </span>
            </button>
          ))}
        </div>

        {/* Protocol rail */}
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted-foreground uppercase tracking-wider mr-1">
            Built on
          </span>
          {PROTOCOLS.map((p) => (
            <a
              key={p.name}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              {p.name}
            </a>
          ))}
        </div>

        {/* Trust signals */}
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
          {TRUST_SIGNALS.map((signal) => (
            <span
              key={signal}
              className="text-xs text-muted-foreground tracking-wide"
            >
              {signal}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
