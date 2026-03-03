'use client';

import type { StreakData } from '@/lib/streaks';

interface StreakCardProps {
  streak: StreakData;
}

export function StreakCard({ streak }: StreakCardProps) {
  const atRisk =
    streak.currentStreak > 0 && !streak.isActiveToday;

  return (
    <div className="rounded-lg bg-muted/30 border border-border/50 p-4 space-y-3">
      <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
        Kudos Streak
      </h3>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-2xl font-bold text-orange-400 leading-none">
            {streak.currentStreak > 0 && (
              <span className="text-base mr-0.5">🔥</span>
            )}
            {streak.currentStreak}
          </div>
          <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-medium">
            Current
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold leading-none">
            {streak.longestStreak}
          </div>
          <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-medium">
            Best
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold leading-none">
            {streak.totalDaysActive}
          </div>
          <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-medium">
            Days
          </div>
        </div>
      </div>

      {atRisk && (
        <p className="text-xs text-orange-400/80 text-center">
          Give kudos today to maintain your streak!
        </p>
      )}
    </div>
  );
}
