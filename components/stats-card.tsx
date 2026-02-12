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
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
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
  const res = await fetch('/api/agents?path=chains');
  if (!res.ok) throw new Error('Failed to fetch network stats');
  const data = await res.json();
  // The chains endpoint returns {success: true, data: {chains: [...]}}
  const chains = data?.data?.chains || [];
  return {
    total_agents: chains.reduce(
      (sum: number, c: { agent_count?: number }) => sum + (c.agent_count || 0),
      0
    ),
    total_feedbacks: chains.reduce(
      (sum: number, c: { feedback_count?: number }) =>
        sum + (c.feedback_count || 0),
      0
    ),
    total_chains: chains.length,
  };
}
