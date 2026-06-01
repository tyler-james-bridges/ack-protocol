'use client';

import { useMemo, useState } from 'react';
import type { DailyReview } from './review-data';
import { CHAIN_META } from './review-data';

interface Props {
  byDate: DailyReview[];
  firstDate: string;
  lastDate: string;
}

export function ReviewHeatmap({ byDate, firstDate, lastDate }: Props) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    date: string;
    total: number;
    chains: Record<string, number>;
  } | null>(null);

  const { weeks, months, maxCount } = useMemo(() => {
    const dateCounts: Record<
      string,
      { total: number; chains: Record<string, number> }
    > = {};
    for (const d of byDate) {
      const total = Object.values(d.chains).reduce(
        (s, n) => s + (n as number),
        0
      );
      dateCounts[d.date] = { total, chains: d.chains };
    }

    const start = new Date(firstDate);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(lastDate);

    const weeks: {
      date: string;
      total: number;
      chains: Record<string, number>;
    }[][] = [];
    const months: { month: string; weekIdx: number }[] = [];
    const current = new Date(start);
    let lastMonth = -1;
    let maxCount = 1;

    while (current <= end || weeks.length < 1) {
      const week: (typeof weeks)[0] = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = current.toISOString().split('T')[0];
        const info = dateCounts[dateStr] || { total: 0, chains: {} };
        week.push({ date: dateStr, ...info });
        if (info.total > maxCount) maxCount = info.total;

        const m = current.getMonth();
        if (m !== lastMonth) {
          months.push({
            month: current.toLocaleString('default', { month: 'short' }),
            weekIdx: weeks.length,
          });
          lastMonth = m;
        }
        current.setDate(current.getDate() + 1);
      }
      weeks.push(week);
      if (current > end) break;
    }

    return { weeks, months, maxCount };
  }, [byDate, firstDate, lastDate]);

  function getColor(total: number) {
    if (total === 0) return 'bg-muted/50';
    const intensity = total / maxCount;
    if (intensity < 0.25) return 'bg-emerald-900/40';
    if (intensity < 0.5) return 'bg-emerald-700/60';
    if (intensity < 0.75) return 'bg-emerald-500/80';
    return 'bg-emerald-400';
  }

  return (
    <div className="border-2 border-black dark:border-neutral-800 bg-card p-4 sm:p-6 overflow-x-auto relative">
      {/* Month labels */}
      <div className="flex mb-2 pl-8 relative h-5">
        {months.map((m, i) => (
          <span
            key={i}
            className="absolute text-[10px] font-mono uppercase tracking-wider text-muted-foreground"
            style={{ left: `${32 + m.weekIdx * 17}px` }}
          >
            {m.month}
          </span>
        ))}
      </div>

      <div className="flex">
        {/* Day labels */}
        <div className="flex flex-col gap-[3px] mr-2 text-[10px] font-mono text-muted-foreground">
          <span className="h-[14px]">&nbsp;</span>
          <span className="h-[14px] flex items-center">MON</span>
          <span className="h-[14px]">&nbsp;</span>
          <span className="h-[14px] flex items-center">WED</span>
          <span className="h-[14px]">&nbsp;</span>
          <span className="h-[14px] flex items-center">FRI</span>
          <span className="h-[14px]">&nbsp;</span>
        </div>

        {/* Grid */}
        <div className="flex gap-[3px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day, di) => (
                <div
                  key={di}
                  className={`w-[14px] h-[14px] ${getColor(day.total)} cursor-crosshair transition-transform hover:scale-150 hover:ring-1 hover:ring-foreground hover:z-10`}
                  onMouseEnter={(e) => {
                    const rect = (
                      e.target as HTMLElement
                    ).getBoundingClientRect();
                    setTooltip({
                      x: rect.left + rect.width / 2,
                      y: rect.top - 8,
                      date: day.date,
                      total: day.total,
                      chains: day.chains,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-4 justify-end text-[10px] font-mono text-muted-foreground">
        <span>LESS</span>
        <div className="w-[14px] h-[14px] bg-muted/50" />
        <div className="w-[14px] h-[14px] bg-emerald-900/40" />
        <div className="w-[14px] h-[14px] bg-emerald-700/60" />
        <div className="w-[14px] h-[14px] bg-emerald-500/80" />
        <div className="w-[14px] h-[14px] bg-emerald-400" />
        <span>MORE</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-popover border-2 border-black dark:border-neutral-700 px-3 py-2 text-xs font-mono pointer-events-none"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-bold">
            {new Date(tooltip.date + 'T12:00:00').toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </div>
          <div className="text-muted-foreground">
            {tooltip.total === 0
              ? 'No reviews'
              : `${tooltip.total} review${tooltip.total > 1 ? 's' : ''}`}
          </div>
          {Object.entries(tooltip.chains).map(([id, count]) => (
            <div key={id} className="flex items-center gap-1.5 mt-0.5">
              <span
                className="w-2 h-2 inline-block"
                style={{
                  backgroundColor: CHAIN_META[Number(id)]?.color ?? '#888',
                }}
              />
              <span>
                {CHAIN_META[Number(id)]?.name ?? id}: {count as number}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
