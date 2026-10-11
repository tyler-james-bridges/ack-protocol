'use client';

import { cn } from '@/lib/utils';

interface StreakBadgeProps {
  streak: number;
  isActive: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function StreakBadge({
  streak,
  isActive,
  size = 'sm',
  className,
}: StreakBadgeProps) {
  if (streak <= 0) return null;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-sm border font-medium tabular-nums',
        isActive
          ? 'border-transparent bg-foreground text-background'
          : 'border-border bg-muted text-foreground',
        size === 'sm' && 'px-1.5 py-0.5 text-[10px] leading-none',
        size === 'md' && 'px-2 py-1 text-xs',
        className
      )}
      title={`${streak}-day kudos streak${isActive ? ' (active today)' : ''}`}
    >
      {streak}d
    </span>
  );
}
