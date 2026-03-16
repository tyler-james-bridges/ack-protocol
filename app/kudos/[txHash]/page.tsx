'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/nav';
import { TipBadge, TipAttribution } from '@/components/tip-badge';
import type { TipInfo } from '@/hooks/useTipsForKudos';
import { Breadcrumbs } from '@/components/breadcrumbs';

type KudosDetails = {
  txHash: string;
  agentId: number;
  agentName: string;
  sender: string;
  senderName?: string;
  value: number;
  category: string;
  message?: string;
  from?: string;
  source?: string;
  timestamp: string;
  blockNumber: string;
};

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function KudosTxPage({
  params,
}: {
  params: Promise<{ txHash: string }>;
}) {
  const [data, setData] = useState<KudosDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tipInfo, setTipInfo] = useState<TipInfo | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { txHash } = await params;
        const res = await fetch(`/api/kudos/${txHash}`);
        const json = await res.json();

        if (!res.ok) {
          throw new Error(
            json?.error || `Failed to load kudos (${res.status})`
          );
        }

        if (!cancelled) {
          setData(json);
          setError(null);

          // Fetch tip data for this kudos
          fetch('/api/tips/by-kudos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ txHashes: [txHash] }),
          })
            .then((r) => (r.ok ? r.json() : { tips: {} }))
            .then((tipData) => {
              const tip = tipData.tips?.[txHash.toLowerCase()];
              if (tip && !cancelled) setTipInfo(tip);
            })
            .catch(() => {});
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load kudos');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [params]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pt-4">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Kudos', href: '/kudos' },
          ]}
          current="Transaction"
        />
      </div>

      <main className="mx-auto max-w-2xl px-4 pt-10 pb-24">
        {loading && (
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">
              Loading kudos transaction...
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 space-y-3">
            <p className="font-semibold text-destructive">
              Could not load this kudos transaction
            </p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}

        {!loading && data && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Kudos Transaction
              </p>
              <h1 className="text-2xl font-bold">{data.agentName}</h1>
            </div>

            <div className="grid gap-2 text-sm">
              <p>
                <span className="text-muted-foreground">From:</span>{' '}
                {data.senderName || truncateAddress(data.sender)}
              </p>
              <p>
                <span className="text-muted-foreground">Category:</span>{' '}
                {data.category}
              </p>
              {!!data.message && (
                <p>
                  <span className="text-muted-foreground">Message:</span> “
                  {data.message}”
                </p>
              )}
              <p>
                <span className="text-muted-foreground">Block:</span>{' '}
                {data.blockNumber}
              </p>
              <p>
                <span className="text-muted-foreground">Time:</span>{' '}
                {new Date(data.timestamp).toLocaleString()}
              </p>
            </div>

            {tipInfo && (
              <div className="border-t border-border pt-3 mt-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">Tip:</span>
                  <TipBadge amountUsd={tipInfo.amountUsd} />
                </div>
                {tipInfo.fromAddress && (
                  <TipAttribution
                    fromAddress={tipInfo.fromAddress}
                    fromAgent={tipInfo.fromAgent}
                  />
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href={`https://abscan.org/tx/${data.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                View on Abscan ↗
              </a>
              <Link
                href="/kudos"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Back to Kudos
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
