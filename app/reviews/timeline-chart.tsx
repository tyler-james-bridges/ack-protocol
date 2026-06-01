'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { DailyReview } from './review-data';

interface Props {
  byDate: DailyReview[];
}

const CHAIN_COLORS: Record<string, string> = {
  '1': '#627EEA',
  '2741': '#00D4AA',
  '8453': '#0052FF',
  '42220': '#FCFF52',
};

const CHAIN_NAMES: Record<string, string> = {
  '1': 'Ethereum',
  '2741': 'Abstract',
  '8453': 'Base',
  '42220': 'Celo',
};

export function TimelineChart({ byDate }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const pad = { top: 16, right: 16, bottom: 28, left: 36 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;

    const dates = byDate.map((d) => d.date).sort();
    const chainIds = ['1', '2741', '8453', '42220'];

    // Accumulate
    const cumulative: Record<string, { date: string; value: number }[]> = {};
    const running: Record<string, number> = {};
    chainIds.forEach((id) => {
      cumulative[id] = [];
      running[id] = 0;
    });

    dates.forEach((date) => {
      const entry = byDate.find((d) => d.date === date);
      chainIds.forEach((id) => {
        running[id] += (entry?.chains[id] as number) || 0;
        cumulative[id].push({ date, value: running[id] });
      });
    });

    const maxVal = Math.max(...chainIds.map((id) => running[id]));

    // Axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, H - pad.bottom);
    ctx.lineTo(W - pad.right, H - pad.bottom);
    ctx.stroke();

    // Y labels
    ctx.fillStyle = '#888';
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const val = Math.round((maxVal * i) / 4);
      const y = H - pad.bottom - (i / 4) * plotH;
      ctx.fillText(String(val), pad.left - 6, y + 3);
      if (i > 0) {
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(W - pad.right, y);
        ctx.strokeStyle = '#222';
        ctx.stroke();
      }
    }

    // Lines per chain
    chainIds.forEach((id) => {
      const points = cumulative[id];
      if (!points.length) return;

      ctx.beginPath();
      points.forEach((p, i) => {
        const x = pad.left + (i / (points.length - 1)) * plotW;
        const y = H - pad.bottom - (p.value / maxVal) * plotH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = CHAIN_COLORS[id];
      ctx.lineWidth = 2;
      ctx.stroke();

      // Area
      const lastPt = points[points.length - 1];
      const lastX =
        pad.left + ((points.length - 1) / (points.length - 1)) * plotW;
      const lastY = H - pad.bottom - (lastPt.value / maxVal) * plotH;
      ctx.lineTo(lastX, H - pad.bottom);
      ctx.lineTo(pad.left, H - pad.bottom);
      ctx.closePath();
      ctx.fillStyle = CHAIN_COLORS[id] + '0D';
      ctx.fill();
    });

    // X labels
    ctx.fillStyle = '#888';
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    const xDates = [
      dates[0],
      dates[Math.floor(dates.length / 2)],
      dates[dates.length - 1],
    ];
    xDates.forEach((d, i) => {
      const x = pad.left + (i / 2) * plotW;
      const label = new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      ctx.fillText(label, x, H - 6);
    });
  }, [byDate]);

  useEffect(() => {
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [draw]);

  return (
    <div className="border-2 border-black dark:border-neutral-800 bg-card p-4 sm:p-6">
      <canvas ref={canvasRef} className="w-full h-[180px] sm:h-[200px]" />
      <div className="flex justify-center gap-4 mt-3 flex-wrap">
        {Object.entries(CHAIN_NAMES).map(([id, name]) => (
          <div
            key={id}
            className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground"
          >
            <span
              className="w-2 h-2 inline-block"
              style={{ backgroundColor: CHAIN_COLORS[id] }}
            />
            {name}
          </div>
        ))}
      </div>
    </div>
  );
}
