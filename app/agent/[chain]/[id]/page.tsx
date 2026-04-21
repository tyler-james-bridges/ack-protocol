'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AgentAvatar } from '@/components/agent-avatar';
import { InlineKudosForm } from '@/components/inline-kudos-form';
import { ChainIcon } from '@/components/chain-icon';
import { CategoryBadge } from '@/components/category-badge';
import { Nav } from '@/components/nav';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { KudosFeed } from '@/components/kudos-feed';
import { TipAgent } from '@/components/tip-agent';
import { getChainName } from '@/hooks';
import { useKudosReceived } from '@/hooks/useKudosReceived';
import { useLinkedHandles } from '@/hooks/useLinkedHandles';
import { fetchAgent, type ScanAgentDetail } from '@/lib/api';
import { KUDOS_CATEGORIES, type KudosCategory } from '@/config/contract';

export default function AgentProfilePage({
  params,
}: {
  params: Promise<{ chain: string; id: string }>;
}) {
  const { chain, id } = use(params);
  const router = useRouter();
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [agent, setAgent] = useState<ScanAgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalTipsUsd, setTotalTipsUsd] = useState<number | null>(null);
  const [tipsGivenUsd, setTipsGivenUsd] = useState<number | null>(null);
  const [tipsReceivedCount, setTipsReceivedCount] = useState(0);
  const [tipsGivenCount, setTipsGivenCount] = useState(0);
  const agentTokenId = agent ? Number(agent.token_id) : undefined;
  const { data: linkedHandles } = useLinkedHandles(agentTokenId);
  const { data: kudos } = useKudosReceived(agentTokenId, linkedHandles);

  const refetchAgent = useCallback((scanId: string) => {
    fetchAgent(scanId)
      .then(setAgent)
      .catch(() => {});
  }, []);

  const handleKudosSuccess = useCallback(() => {
    const CHAIN_NAMES: Record<string, string> = {
      abstract: '2741',
      ethereum: '1',
      base: '8453',
      bnb: '56',
      gnosis: '100',
      celo: '42220',
      arbitrum: '42161',
    };
    const resolved = CHAIN_NAMES[chain.toLowerCase()] || chain;
    const scanId = `${resolved}:${id}`;
    setTimeout(() => refetchAgent(scanId), 3000);
  }, [chain, id, refetchAgent]);

  useEffect(() => {
    const CHAIN_NAMES: Record<string, string> = {
      abstract: '2741',
      ethereum: '1',
      base: '8453',
      bnb: '56',
      gnosis: '100',
      celo: '42220',
      arbitrum: '42161',
    };
    const resolved = CHAIN_NAMES[chain.toLowerCase()] || chain;
    if (resolved !== chain) {
      router.replace(`/agent/${resolved}/${id}`);
      return;
    }
    const scanId = `${chain}:${id}`;
    setLoading(true);
    fetchAgent(scanId)
      .then((a) => {
        setAgent(a);
        const wallet = a.owner_address || '';
        fetch(`/api/tips/stats?agentId=${a.token_id}&wallet=${wallet}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data) {
              setTotalTipsUsd(data.totalReceived || 0);
              setTipsGivenUsd(data.totalGiven || 0);
              setTipsReceivedCount(data.countReceived || 0);
              setTipsGivenCount(data.countGiven || 0);
            }
          })
          .catch(() => {});
      })
      .catch(() => setError('Agent not found'))
      .finally(() => setLoading(false));
  }, [chain, id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Nav />
        <div className="mx-auto max-w-5xl px-4 pt-4">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Explore', href: '/explore' },
            ]}
            current="..."
          />
        </div>
        <div className="mx-auto max-w-5xl px-4 pt-8">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-80 shrink-0 space-y-4">
              <div className="border-2 border-black p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 bg-black/10" />
                  <div className="space-y-2 flex-1">
                    <div className="h-6 w-36 bg-black/10" />
                    <div className="h-3 w-24 bg-black/10" />
                  </div>
                </div>
                <div className="h-4 w-full bg-black/10" />
                <div className="h-4 w-3/4 bg-black/10" />
                <div className="h-20 bg-black/10" />
                <div className="h-9 bg-black/10" />
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div className="h-5 w-32 bg-black/10" />
              <div className="h-28 bg-black/10" />
              <div className="h-28 bg-black/10" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-white">
        <Nav />
        <div className="mx-auto max-w-5xl px-4 pt-4">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Explore', href: '/explore' },
            ]}
            current="Not Found"
          />
        </div>
        <div className="mx-auto max-w-3xl px-4 pt-12 text-center space-y-4">
          <p className="text-lg font-mono text-black/50">
            {error || 'Agent not found'}
          </p>
          <Button variant="outline" onClick={() => router.push('/')}>
            BACK TO HOME
          </Button>
        </div>
      </div>
    );
  }

  const categoryCounts: Record<string, number> = {};
  if (kudos) {
    kudos.forEach((k) => {
      if (KUDOS_CATEGORIES.includes(k.tag2 as KudosCategory))
        categoryCounts[k.tag2] = (categoryCounts[k.tag2] || 0) + 1;
    });
  }
  const sortedCategories = Object.entries(categoryCounts).sort(
    (a, b) => b[1] - a[1]
  );
  const uniqueGivers = kudos ? new Set(kudos.map((k) => k.sender)).size : 0;

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <div className="mx-auto max-w-5xl px-4 pt-4">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Explore', href: '/explore' },
          ]}
          current={agent.name}
        />
      </div>

      <div className="mx-auto max-w-5xl px-4 pt-6 pb-16">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          {/* LEFT COLUMN - Profile Sidebar */}
          <aside className="w-full lg:w-80 shrink-0 space-y-4">
            <div className="border-2 border-black p-5 space-y-4">
              {/* Identity header */}
              <div className="flex items-start gap-3.5">
                <AgentAvatar
                  name={agent.name}
                  imageUrl={agent.image_url}
                  size={64}
                  className="rounded-none shrink-0 border-2 border-black"
                />
                <div className="min-w-0 flex-1 pt-0.5">
                  <h1 className="text-lg font-bold font-mono uppercase tracking-wider truncate leading-tight">
                    {agent.name}
                  </h1>
                  <div className="flex items-center gap-1.5 mt-1">
                    <ChainIcon chainId={agent.chain_id} size={14} />
                    <span className="text-xs font-mono text-black/50 uppercase tracking-wider">
                      {getChainName(agent.chain_id)}
                    </span>
                    <span className="text-xs font-mono text-black/40">
                      #{agent.token_id}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {agent.is_verified && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 gap-0.5"
                      >
                        <svg
                          className="h-2.5 w-2.5"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        VERIFIED
                      </Badge>
                    )}
                    {agent.is_active && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0"
                      >
                        <span className="relative flex h-1.5 w-1.5 mr-0.5">
                          <span className="relative inline-flex h-1.5 w-1.5 bg-black" />
                        </span>
                        ACTIVE
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {agent.description && (
                <p className="text-sm font-mono text-black/50 leading-relaxed">
                  {agent.description}
                </p>
              )}

              {/* Social Links */}
              {(() => {
                const links: { type: string; url: string }[] = [];
                const svc = agent.services || {};
                if (svc.web?.endpoint)
                  links.push({ type: 'web', url: svc.web.endpoint });
                const ocServices =
                  agent.raw_metadata?.offchain_content?.services || [];
                for (const s of ocServices) {
                  const name = s.name?.toLowerCase();
                  const ep = s.endpoint;
                  if (!ep) continue;
                  if (name === 'twitter' || name === 'x')
                    links.push({ type: 'twitter', url: ep });
                  if (
                    (name === 'website' || name === 'web') &&
                    !links.some((l) => l.type === 'web')
                  )
                    links.push({ type: 'web', url: ep });
                }
                if (links.length === 0) return null;
                return (
                  <div className="flex items-center gap-2 flex-wrap">
                    {links.map(({ type, url }) => (
                      <a
                        key={type}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 border border-black/10 px-2.5 py-1 text-xs font-mono text-black/50 hover:bg-black hover:text-white transition-colors"
                      >
                        {type === 'twitter' ? (
                          <svg
                            className="h-3 w-3"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                          </svg>
                        ) : (
                          <svg
                            className="h-3 w-3"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                            />
                          </svg>
                        )}
                        {type === 'twitter'
                          ? url.replace(
                              /^https?:\/\/(x\.com|twitter\.com)\//,
                              '@'
                            )
                          : new URL(url).hostname.replace(/^www\./, '')}
                      </a>
                    ))}
                  </div>
                );
              })()}

              {/* Score + Stats */}
              <div className="border-2 border-black p-4">
                <div className="flex items-center gap-4">
                  <div className="text-center shrink-0">
                    <div className="text-3xl font-bold font-mono leading-none">
                      {agent.total_score.toFixed(1)}
                    </div>
                    <div className="text-[10px] font-mono text-black/40 mt-1 uppercase tracking-wider">
                      SCORE
                    </div>
                  </div>
                  <div className="w-px h-10 bg-black" />
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 flex-1 text-sm font-mono">
                    <div>
                      <span className="font-bold">{kudos?.length ?? 0}</span>
                      <span className="text-black/50 ml-1 text-xs">kudos</span>
                    </div>
                    <div>
                      <span className="font-bold">{uniqueGivers}</span>
                      <span className="text-black/50 ml-1 text-xs">
                        {uniqueGivers === 1 ? 'giver' : 'givers'}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold">
                        {agent.scores?.rank
                          ? `#${agent.scores.rank.toLocaleString()}`
                          : '-'}
                      </span>
                      <span className="text-black/50 ml-1 text-xs">rank</span>
                    </div>
                    <div>
                      <span className="font-bold">{agent.star_count}</span>
                      <span className="text-black/50 ml-1 text-xs">stars</span>
                    </div>
                    {totalTipsUsd !== null && totalTipsUsd > 0 && (
                      <div>
                        <span className="font-bold">
                          ${totalTipsUsd.toFixed(2)}
                        </span>
                        <span className="text-black/50 ml-1 text-xs">
                          received ({tipsReceivedCount})
                        </span>
                      </div>
                    )}
                    {tipsGivenUsd !== null && tipsGivenUsd > 0 && (
                      <div>
                        <span className="font-bold">
                          ${tipsGivenUsd.toFixed(2)}
                        </span>
                        <span className="text-black/50 ml-1 text-xs">
                          tipped ({tipsGivenCount})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Category Badges */}
              {sortedCategories.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-wider text-black/40 font-mono font-bold">
                    REPUTATION
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {sortedCategories.map(([cat, count]) => (
                      <CategoryBadge
                        key={cat}
                        category={cat as KudosCategory}
                        count={count}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Tip with USDC */}
              {agent.owner_address && (
                <TipAgent
                  agentName={agent.name}
                  agentTokenId={agent.token_id}
                  ownerAddress={agent.owner_address}
                />
              )}

              {/* Give Kudos CTAs */}
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  size="default"
                  onClick={() => {
                    if (isConnected) {
                      document.getElementById('give-kudos')?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                      });
                    } else {
                      openConnectModal?.();
                    }
                  }}
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                  GIVE KUDOS
                </Button>
                <a
                  href={`https://x.com/intent/post?text=${encodeURIComponent(`ACK: @ack_onchain #${agent.token_id} ++`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 border-2 border-black px-3 py-2 text-sm font-mono uppercase tracking-wider text-black hover:bg-black hover:text-white transition-colors"
                  title="Give Kudos via Post"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  POST
                </a>
              </div>

              {/* On-Chain Info */}
              <details
                open
                className="group border-2 border-black overflow-hidden"
              >
                <summary className="flex cursor-pointer items-center justify-between px-3 py-2.5 text-xs font-mono font-bold uppercase tracking-wider text-black/50 hover:text-black transition-colors select-none">
                  ON-CHAIN DETAILS
                  <svg
                    className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-open:rotate-180"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m19.5 8.25-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </summary>
                <div className="border-t-2 border-black px-3 py-2.5 space-y-1.5 text-xs font-mono">
                  <InfoRow label="Owner" value={agent.owner_address} mono />
                  <InfoRow
                    label="Wallet"
                    value={agent.agent_wallet ?? ''}
                    mono
                  />
                  <InfoRow label="Chain" value={getChainName(agent.chain_id)} />
                  <InfoRow label="Token ID" value={agent.token_id} />
                  <InfoRow
                    label="Created"
                    value={new Date(agent.created_at).toLocaleDateString()}
                  />
                </div>
              </details>

              {/* Protocols & Tags */}
              {((agent?.supported_protocols?.length ?? 0) > 0 ||
                (agent?.tags?.length ?? 0) > 0) && (
                <details
                  open
                  className="group border-2 border-black overflow-hidden"
                >
                  <summary className="flex cursor-pointer items-center justify-between px-3 py-2.5 text-xs font-mono font-bold uppercase tracking-wider text-black/50 hover:text-black transition-colors select-none">
                    PROTOCOLS & TAGS
                    <svg
                      className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-open:rotate-180"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m19.5 8.25-7.5 7.5-7.5-7.5"
                      />
                    </svg>
                  </summary>
                  <div className="border-t-2 border-black px-3 py-2.5 space-y-2.5">
                    {agent?.supported_protocols?.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-mono text-black/40 uppercase tracking-wider">
                          PROTOCOLS
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {agent.supported_protocols.map((p) => (
                            <Badge
                              key={p}
                              variant="secondary"
                              className="text-[10px]"
                            >
                              {p}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {(agent?.tags?.length ?? 0) > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-mono text-black/40 uppercase tracking-wider">
                          TAGS
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {agent.tags?.map((t) => (
                            <Badge
                              key={t}
                              variant="outline"
                              className="text-[10px]"
                            >
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* 8004scan link */}
              <a
                href={`https://www.8004scan.io/agents/${getChainSlug(agent.chain_id)}/${agent.token_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-black/40 hover:text-black transition-colors py-1"
              >
                View on 8004scan
                <svg
                  className="h-3 w-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                  />
                </svg>
              </a>
            </div>
          </aside>

          {/* RIGHT COLUMN - Kudos Feed + Form */}
          <main className="flex-1 min-w-0 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold font-mono uppercase tracking-wider">
                  KUDOS
                </h2>
                {kudos && kudos.length > 0 && (
                  <span className="inline-flex items-center justify-center border-2 border-black bg-black text-white text-xs font-mono font-bold px-2 py-0.5 tabular-nums">
                    {kudos.length}
                  </span>
                )}
              </div>
              <Button
                size="sm"
                className="lg:hidden"
                onClick={() => {
                  if (isConnected) {
                    document
                      .getElementById('give-kudos')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  } else {
                    openConnectModal?.();
                  }
                }}
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                GIVE KUDOS
              </Button>
            </div>

            <KudosFeed agentId={Number(agent.token_id)} />

            <div id="give-kudos" className="pt-2 scroll-mt-20">
              <InlineKudosForm
                agentTokenId={agent.token_id}
                agentName={agent.name}
                ownerAddress={agent.owner_address}
                targetChainId={agent.chain_id}
                onSuccess={handleKudosSuccess}
              />
            </div>
          </main>
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
    56: 'bsc',
    10: 'optimism',
    43114: 'avalanche',
    196: 'xlayer',
    100: 'gnosis',
    42220: 'celo',
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
    mono && value && value.length > 20
      ? `${value.slice(0, 8)}...${value.slice(-6)}`
      : value || '-';

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-black/50 uppercase tracking-wider">{label}</span>
      <span className={mono ? 'font-mono text-xs' : ''}>{truncated}</span>
    </div>
  );
}
