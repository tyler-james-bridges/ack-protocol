import { cn } from '@/lib/utils';

interface StatsCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  className?: string;
}

export function StatsCard({
  label,
  value,
  subtitle,
  className,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-4 space-y-1 card-glow',
        className
      )}
    >
      <p className="text-sm md:text-base text-muted-foreground">{label}</p>
      <p className="text-2xl md:text-3xl font-bold tracking-tight">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

export interface NetworkStats {
  total_agents: number;
  total_feedbacks: number;
  total_chains: number;
}

export async function fetchNetworkStats(): Promise<NetworkStats> {
  const [agentsRes, chainsRes] = await Promise.all([
    fetch('/api/agents?path=agents&limit=1'),
    fetch('/api/agents?path=chains'),
  ]);

  let totalAgents = 0;
  if (agentsRes.ok) {
    const agentsData = await agentsRes.json();
    totalAgents = agentsData?.total || 0;
  }

  let mainnetChainCount = 0;
  if (chainsRes.ok) {
    const chainsData = await chainsRes.json();
    const chains = chainsData?.data?.chains || [];
    mainnetChainCount = chains.filter(
      (c: { is_testnet: boolean }) => !c.is_testnet
    ).length;
  }

  // Estimate total feedbacks from a sample of top agents
  // 8004scan doesn't have a global feedback count endpoint
  const feedbackRes = await fetch(
    '/api/agents?path=agents&limit=100&sort_by=total_feedbacks&sort_order=desc'
  );
  let totalFeedbacks = 0;
  if (feedbackRes.ok) {
    const feedbackData = await feedbackRes.json();
    const items = feedbackData?.items || [];
    totalFeedbacks = items.reduce(
      (sum: number, a: { total_feedbacks?: number }) =>
        sum + (a.total_feedbacks || 0),
      0
    );
  }

  return {
    total_agents: totalAgents,
    total_feedbacks: totalFeedbacks,
    total_chains: mainnetChainCount,
  };
}
