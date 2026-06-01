import type { Metadata } from 'next';
import { Nav } from '@/components/nav';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { getReviewData } from './review-data';
import { ReviewHeatmap } from './review-heatmap';
import { ChainBars } from './chain-bars';
import { NetworkGraph } from './network-graph';
import { TimelineChart } from './timeline-chart';
import { RecentReviews } from './recent-reviews';
import { LiveStats } from './live-stats';

export const metadata: Metadata = {
  title: 'Reviews — ACK Cross-Chain Feedback Explorer',
  description:
    'Live on-chain reviews across Ethereum, Abstract, Base & Celo. Every review verified via ERC-8004.',
  openGraph: {
    title: 'ACK Reviews — Cross-Chain Feedback Explorer',
    description:
      'Live verified on-chain agent reviews across 4 chains via ERC-8004.',
  },
};

export default function ReviewsPage() {
  // Static data used as fallback + for heatmap/timeline (historical aggregate)
  const data = getReviewData();
  const uniqueAgents = data.chains.reduce((s, c) => s + c.uniqueAgents, 0);
  const activeDays = data.byDate.length;

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-16">
        <Breadcrumbs items={[{ label: 'HOME', href: '/' }]} current="REVIEWS" />

        {/* Header */}
        <div className="text-center mt-8 mb-0">
          <h1 className="text-3xl sm:text-4xl font-mono font-bold tracking-tight">
            REVIEW EXPLORER
          </h1>

          {/* Live stats: counts update in real-time, falls back to static data */}
          <LiveStats
            fallbackTotal={data.total}
            fallbackChainCount={data.chains.length}
            fallbackAgents={uniqueAgents}
            fallbackDays={activeDays}
          />

          <div className="inline-flex items-center gap-1.5 border-2 border-emerald-600/40 bg-emerald-600/10 px-3 py-1 mb-10 text-[11px] font-mono text-emerald-500 uppercase tracking-wider">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            VERIFIED VIA ERC-8004
          </div>
        </div>

        {/* Activity Heatmap — GitHub contribution style hero */}
        <section className="mb-10">
          <h2 className="text-sm font-mono font-bold tracking-wider mb-3 flex items-center gap-3">
            REVIEW ACTIVITY
            <span className="flex-1 h-px bg-border" />
          </h2>
          <ReviewHeatmap
            byDate={data.byDate}
            firstDate={data.firstDate}
            lastDate={data.lastDate}
          />
        </section>

        {/* Recent Reviews — live on-chain proof, polls every 30s */}
        <section className="mb-10">
          <h2 className="text-sm font-mono font-bold tracking-wider mb-3 flex items-center gap-3">
            RECENT REVIEWS
            <span className="flex-1 h-px bg-border" />
          </h2>
          <RecentReviews />
        </section>

        {/* Chain Distribution */}
        <section className="mb-10">
          <h2 className="text-sm font-mono font-bold tracking-wider mb-3 flex items-center gap-3">
            CHAIN DISTRIBUTION
            <span className="flex-1 h-px bg-border" />
          </h2>
          <ChainBars chains={data.chains} />
        </section>

        {/* Cumulative Timeline */}
        <section className="mb-10">
          <h2 className="text-sm font-mono font-bold tracking-wider mb-3 flex items-center gap-3">
            CUMULATIVE REVIEWS
            <span className="flex-1 h-px bg-border" />
          </h2>
          <TimelineChart byDate={data.byDate} />
        </section>

        {/* Network Graph */}
        <section className="mb-10">
          <h2 className="text-sm font-mono font-bold tracking-wider mb-3 flex items-center gap-3">
            REVIEW NETWORK
            <span className="flex-1 h-px bg-border" />
          </h2>
          <NetworkGraph chains={data.chains} total={data.total} />
        </section>

        {/* Footer */}
        <div className="text-center pt-8 border-t-2 border-black dark:border-neutral-800">
          <p className="text-xs font-mono text-muted-foreground">
            ACK — on-chain agent feedback via{' '}
            <a
              href="https://eips.ethereum.org/EIPS/eip-8004"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-500 hover:underline"
            >
              ERC-8004
            </a>
          </p>
          <p className="text-[10px] font-mono text-muted-foreground mt-1">
            DATA FROM ETHEREUM · ABSTRACT · BASE · CELO MAINNETS
          </p>
        </div>
      </main>
    </div>
  );
}
