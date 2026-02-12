'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AgentAvatar } from '@/components/agent-avatar';
import { InlineKudosForm } from '@/components/inline-kudos-form';
import { ChainIcon } from '@/components/chain-icon';
import { StatsCard } from '@/components/stats-card';
import { CategoryBadge } from '@/components/category-badge';
import { Nav } from '@/components/nav';
import { KudosFeed } from '@/components/kudos-feed';
import { getChainName } from '@/hooks';
import { fetchAgent, type ScanAgent } from '@/lib/api';
import { KUDOS_CATEGORIES } from '@/config/contract';
import Link from 'next/link';

export default function AgentProfilePage({
  params,
}: {
  params: Promise<{ chain: string; id: string }>;
}) {
  const { chain, id } = use(params);
  const router = useRouter();
  const [agent, setAgent] = useState<ScanAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const scanId = `${chain}:${id}`;
    setLoading(true);
    fetchAgent(scanId)
      .then(setAgent)
      .catch(() => setError('Agent not found'))
      .finally(() => setLoading(false));
  }, [chain, id]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Nav />
        <div className="mx-auto max-w-4xl px-4 pt-12">
          <div className="space-y-4">
            <div className="h-8 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-96 animate-pulse rounded bg-muted" />
            <div className="grid grid-cols-3 gap-3 pt-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-xl bg-muted"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen">
        <Nav />
        <div className="mx-auto max-w-4xl px-4 pt-12 text-center space-y-4">
          <p className="text-lg text-muted-foreground">
            {error || 'Agent not found'}
          </p>
          <Button variant="outline" onClick={() => router.push('/')}>
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Nav />

      <div className="mx-auto max-w-4xl px-4 pt-8 pb-16 space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <AgentAvatar
              name={agent.name}
              imageUrl={agent.image_url}
              size={56}
              className="rounded-2xl"
            />

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold truncate">{agent.name}</h1>
                {agent.is_verified && (
                  <Badge variant="secondary">Verified</Badge>
                )}
                {agent.is_active && (
                  <Badge
                    variant="outline"
                    className="text-green-400 border-green-400/30 pulse-green"
                  >
                    Active
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <ChainIcon chainId={agent.chain_id} size={14} />
                <span className="font-medium">
                  {getChainName(agent.chain_id)}
                </span>
                <span>· Agent #{agent.token_id}</span>
              </div>
            </div>
          </div>

          {agent.description && (
            <p className="text-sm text-muted-foreground">{agent.description}</p>
          )}

          <a href="#give-kudos" className="block sm:inline-block">
            <Button className="w-full sm:w-auto">Give Kudos ↓</Button>
          </a>
        </div>

        {/* Stats — dual reputation */}
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase mb-2">
              Protocol Score
              <span className="ml-1.5 text-muted-foreground/50 normal-case tracking-normal">
                via 8004scan
              </span>
            </p>
            <div className="grid grid-cols-3 gap-3">
              <StatsCard label="Score" value={agent.total_score.toFixed(1)} />
              <StatsCard label="Stars" value={agent.star_count} />
              <StatsCard
                label="Rank"
                value={
                  agent.scores?.rank
                    ? `#${agent.scores.rank.toLocaleString()}`
                    : '-'
                }
              />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-medium tracking-wider text-primary uppercase mb-2">
              Kudos Reputation
              <span className="ml-1.5 text-primary/50 normal-case tracking-normal">
                peer feedback
              </span>
            </p>
            <div className="grid grid-cols-3 gap-3">
              <StatsCard label="Kudos" value={agent.total_feedbacks} />
              <StatsCard
                label="Avg Rating"
                value={
                  agent.average_score > 0 ? agent.average_score.toFixed(1) : '—'
                }
              />
              <StatsCard
                label="Categories"
                value={agent.categories?.length || '—'}
              />
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* On-chain info */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">On-Chain Info</h2>
            <div className="rounded-xl border border-border p-4 space-y-2 text-sm">
              <InfoRow label="Owner" value={agent.owner_address} mono />
              <InfoRow label="Wallet" value={agent.agent_wallet} mono />
              <InfoRow label="Chain" value={getChainName(agent.chain_id)} />
              <InfoRow label="Token ID" value={agent.token_id} />
              <InfoRow
                label="Created"
                value={new Date(agent.created_at).toLocaleDateString()}
              />
            </div>
          </div>

          {/* Protocols & Tags */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Protocols & Tags</h2>
            <div className="rounded-xl border border-border p-4 space-y-3">
              {agent.supported_protocols.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Protocols</p>
                  <div className="flex flex-wrap gap-1">
                    {agent.supported_protocols.map((p) => (
                      <Badge key={p} variant="secondary">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {agent.tags.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {agent.tags.map((t) => (
                      <Badge key={t} variant="outline">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {agent.supported_protocols.length === 0 &&
                agent.tags.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No protocols or tags configured yet.
                  </p>
                )}
            </div>

            {/* Kudos categories placeholder */}
            <h2 className="text-lg font-semibold pt-2">Kudos Categories</h2>
            <div className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap gap-2">
                {KUDOS_CATEGORIES.map((cat) => (
                  <CategoryBadge key={cat} category={cat} size="md" />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Give kudos to rate this agent in specific categories.
              </p>
            </div>
          </div>
        </div>

        {/* Onchain Kudos Feed */}
        <KudosFeed agentId={Number(agent.token_id)} />

        {/* Give Kudos Form */}
        <InlineKudosForm agentTokenId={agent.token_id} agentName={agent.name} ownerAddress={agent.owner_address} />

        {/* 8004scan link */}
        <div className="text-center pt-4">
          <a
            href={`https://www.8004scan.io/agents/${getChainSlug(agent.chain_id)}/${agent.token_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View full details on 8004scan
          </a>
        </div>
      </div>
    </div>
  );
}

function getChainSlug(chainId: number): string {
  const slugs: Record<number, string> = {
    1: 'ethereum',
    2741: 'abstract',
    8453: 'base',
    42161: 'arbitrum',
    137: 'polygon',
    56: 'bnb',
    10: 'optimism',
    43114: 'avalanche',
    196: 'xlayer',
  };
  return slugs[chainId] || String(chainId);
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const truncated =
    mono && value.length > 20
      ? `${value.slice(0, 8)}...${value.slice(-6)}`
      : value;

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? 'font-mono text-xs' : ''}>{truncated}</span>
    </div>
  );
}
