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
        'rounded-none border border-black/20 bg-white p-4 space-y-1 ',
        className
      )}
    >
      <p className="text-sm md:text-base text-black/50">{label}</p>
      <p className="text-2xl md:text-3xl font-bold tracking-tight">{value}</p>
      {subtitle && <p className="text-xs text-black/50">{subtitle}</p>}
    </div>
  );
}

export interface NetworkStats {
  total_agents: number;
  total_feedbacks: number;
  total_kudos: number;
}

export async function fetchNetworkStats(): Promise<NetworkStats> {
  // Fetch Abstract-only stats
  const [agentsRes, feedbackRes, kudosRes] = await Promise.all([
    fetch('/api/agents?path=agents&chain_id=2741&limit=1'),
    fetch(
      '/api/agents?path=agents&chain_id=2741&limit=50&sort_by=total_feedbacks&sort_order=desc'
    ),
    fetch('/api/streaks?top=0'),
  ]);

  let totalAgents = 0;
  if (agentsRes.ok) {
    const agentsData = await agentsRes.json();
    totalAgents = agentsData?.total || 0;
  }

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

  let totalKudos = 0;
  if (kudosRes.ok) {
    const kudosData = await kudosRes.json();
    totalKudos = kudosData?.totalKudos || 0;
  }

  return {
    total_agents: totalAgents,
    total_feedbacks: totalFeedbacks,
    total_kudos: totalKudos,
  };
}
