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
        'inline-flex items-center gap-0.5 font-mono uppercase tracking-wider tabular-nums shrink-0',
        isActive
          ? 'bg-black text-white border border-black'
          : 'bg-white text-black border border-black/20',
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
