'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { ChainReviewStats } from './review-data';

interface Props {
  chains: ChainReviewStats[];
  total: number;
}

export function NetworkGraph({ chains, total }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const animRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const cx = W / 2;
    const cy = H / 2;

    const centerRadius = 26;
    const orbitRadius = Math.min(W, H) * 0.3;
    const sorted = [...chains].sort((a, b) => b.count - a.count);

    const chainNodes = sorted.map((chain, i) => {
      const angle = (i / sorted.length) * Math.PI * 2 - Math.PI / 2;
      const r = 12 + (chain.count / total) * 18;
      return {
        x: cx + Math.cos(angle) * orbitRadius,
        y: cy + Math.sin(angle) * orbitRadius,
        r,
        chain,
        angle,
      };
    });

    // Pre-compute agent dots
    const agentNodes: {
      x: number;
      y: number;
      r: number;
      color: string;
      seed: number;
    }[] = [];
    chainNodes.forEach((cn) => {
      const count = Math.min(cn.chain.uniqueAgents, 36);
      const dotRadius = Math.min(W, H) * 0.12;
      for (let i = 0; i < count; i++) {
        const angle = cn.angle + (i / count - 0.5) * 1.1;
        // Deterministic pseudo-random from seed
        const seed = cn.chain.id * 1000 + i;
        const pseudoRand = (((Math.sin(seed) * 43758.5453) % 1) + 1) % 1;
        const dist = dotRadius * (0.5 + pseudoRand * 0.5);
        agentNodes.push({
          x: cn.x + Math.cos(angle) * dist,
          y: cn.y + Math.sin(angle) * dist,
          r: 1.5 + pseudoRand * 2,
          color: cn.chain.color,
          seed,
        });
      }
    });

    let frame = 0;

    function render() {
      ctx.clearRect(0, 0, W, H);
      frame++;

      // Connection lines
      chainNodes.forEach((cn) => {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cn.x, cn.y);
        ctx.strokeStyle = cn.chain.color + '18';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Agent dots
      agentNodes.forEach((an) => {
        const pulse = Math.sin(frame * 0.015 + an.seed * 0.2) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(an.x, an.y, an.r, 0, Math.PI * 2);
        const alpha = Math.floor(pulse * 80)
          .toString(16)
          .padStart(2, '0');
        ctx.fillStyle = an.color + alpha;
        ctx.fill();
      });

      // Chain nodes
      chainNodes.forEach((cn) => {
        // Glow
        const glow = ctx.createRadialGradient(
          cn.x,
          cn.y,
          0,
          cn.x,
          cn.y,
          cn.r * 2.5
        );
        glow.addColorStop(0, cn.chain.color + '25');
        glow.addColorStop(1, cn.chain.color + '00');
        ctx.beginPath();
        ctx.arc(cn.x, cn.y, cn.r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Node
        ctx.beginPath();
        ctx.arc(cn.x, cn.y, cn.r, 0, Math.PI * 2);
        ctx.fillStyle = cn.chain.color;
        ctx.fill();

        // Label
        ctx.fillStyle = '#f5f5f5';
        ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(cn.chain.name.toUpperCase(), cn.x, cn.y + cn.r + 16);
        ctx.fillStyle = cn.chain.color;
        ctx.font = '700 11px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillText(String(cn.chain.count), cn.x, cn.y + cn.r + 28);
      });

      // Center ACK node
      const glow = ctx.createRadialGradient(
        cx,
        cy,
        0,
        cx,
        cy,
        centerRadius * 2.5
      );
      glow.addColorStop(0, '#00d4aa30');
      glow.addColorStop(1, '#00d4aa00');
      ctx.beginPath();
      ctx.arc(cx, cy, centerRadius * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, centerRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#00d4aa';
      ctx.fill();

      ctx.fillStyle = '#000';
      ctx.font = '700 13px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ACK', cx, cy);

      animRef.current = requestAnimationFrame(render);
    }

    render();
  }, [chains, total]);

  useEffect(() => {
    draw();
    const handleResize = () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      draw();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [draw]);

  return (
    <div className="border-2 border-black dark:border-neutral-800 bg-card overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-[400px] sm:h-[450px]" />
      <div className="flex justify-center gap-4 sm:gap-6 flex-wrap px-4 py-3 border-t-2 border-black dark:border-neutral-800">
        {chains
          .sort((a, b) => b.count - a.count)
          .map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground"
            >
              <span
                className="w-2.5 h-2.5 inline-block"
                style={{ backgroundColor: c.color }}
              />
              {c.name} — {c.count}
            </div>
          ))}
      </div>
    </div>
  );
}
