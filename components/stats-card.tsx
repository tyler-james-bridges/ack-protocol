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
