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
        'inline-flex items-center gap-0.5 rounded-full font-medium tabular-nums shrink-0',
        isActive
          ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
          : 'bg-muted/50 text-muted-foreground border border-border',
        size === 'sm' && 'px-1.5 py-0.5 text-[10px] leading-none',
        size === 'md' && 'px-2 py-1 text-xs',
        className
      )}
      title={`${streak}-day kudos streak${isActive ? ' (active today)' : ''}`}
    >
      <span className={size === 'sm' ? 'text-[10px]' : 'text-xs'}>
        🔥
      </span>
      {streak}
    </span>
  );
}
