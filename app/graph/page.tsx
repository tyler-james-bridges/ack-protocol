'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Nav } from '@/components/nav';
import { ChainIcon } from '@/components/chain-icon';
import { useLeaderboard, getChainName } from '@/hooks';
import { buildGraphData, getChainColor, type GraphNode } from '@/lib/graph';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
});

const CHAIN_FILTERS = [
  { label: 'All Chains', value: 0 },
  { label: 'Abstract', value: 2741 },
  { label: 'Base', value: 8453 },
  { label: 'Ethereum', value: 1 },
  { label: 'Arbitrum', value: 42161 },
];

export default function GraphPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [chainFilter, setChainFilter] = useState(0);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const animFrameRef = useRef<number>(0);

  const { data: agents, isLoading } = useLeaderboard({ limit: 100 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height: Math.max(height, 500) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Tune force simulation for spread
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.d3Force('charge')?.strength(-300).distanceMax(500);
    fg.d3Force('link')?.distance(80).strength(0.1);
    fg.d3Force('center')?.strength(0.05);
  }, [agents, chainFilter]);

  const graphData = useMemo(() => {
    if (!agents) return { nodes: [], links: [] };
    const filtered =
      chainFilter === 0
        ? agents
        : agents.filter((a) => a.chain_id === chainFilter);
    return buildGraphData(filtered);
  }, [agents, chainFilter]);

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      router.push(`/agent/${node.chainId}/${node.tokenId}`);
    },
    [router]
  );

  const nodeCanvasObject = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const baseRadius = Math.max(5, Math.min(24, node.score / 4));
      const isHovered = hoveredNode?.id === node.id;
      const color = getChainColor(node.chainId);
      const time = settled ? 0 : Date.now() / 1000;

      // Outer glow — always on, pulsing
      const pulseScale = 1 + Math.sin(time * 2 + node.score) * 0.15;
      const glowRadius = baseRadius * 2.5 * pulseScale;
      const glow = ctx.createRadialGradient(x, y, baseRadius * 0.5, x, y, glowRadius);
      glow.addColorStop(0, `${color}30`);
      glow.addColorStop(0.5, `${color}10`);
      glow.addColorStop(1, `${color}00`);
      ctx.beginPath();
      ctx.arc(x, y, glowRadius, 0, 2 * Math.PI);
      ctx.fillStyle = glow;
      ctx.fill();

      // Hover ring
      if (isHovered) {
        const hoverGlow = ctx.createRadialGradient(x, y, baseRadius, x, y, baseRadius * 3);
        hoverGlow.addColorStop(0, `${color}60`);
        hoverGlow.addColorStop(1, `${color}00`);
        ctx.beginPath();
        ctx.arc(x, y, baseRadius * 3, 0, 2 * Math.PI);
        ctx.fillStyle = hoverGlow;
        ctx.fill();
      }

      // Core circle with gradient
      const coreGrad = ctx.createRadialGradient(
        x - baseRadius * 0.3, y - baseRadius * 0.3, 0,
        x, y, baseRadius
      );
      coreGrad.addColorStop(0, lightenColor(color, 40));
      coreGrad.addColorStop(0.7, color);
      coreGrad.addColorStop(1, darkenColor(color, 30));
      ctx.beginPath();
      ctx.arc(x, y, baseRadius, 0, 2 * Math.PI);
      ctx.fillStyle = coreGrad;
      ctx.fill();

      // Feedback ring — orbiting dots for agents with kudos
      if (node.feedbacks > 0) {
        const orbitRadius = baseRadius + 5;
        const dotCount = Math.min(node.feedbacks, 6);
        for (let i = 0; i < dotCount; i++) {
          const angle = (time * 1.5) + (i * (Math.PI * 2) / dotCount);
          const dx = x + Math.cos(angle) * orbitRadius;
          const dy = y + Math.sin(angle) * orbitRadius;
          ctx.beginPath();
          ctx.arc(dx, dy, 1.5, 0, 2 * Math.PI);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        }
      }

      // Label
      if (isHovered || (baseRadius > 12 && globalScale > 0.8)) {
        const label = node.name.length > 18 ? node.name.slice(0, 16) + '...' : node.name;
        const fontSize = isHovered ? 13 : Math.max(10, 11 / globalScale);
        ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Text bg
        const textWidth = ctx.measureText(label).width;
        const padding = 4;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath();
        ctx.roundRect(
          x - textWidth / 2 - padding,
          y + baseRadius + 4,
          textWidth + padding * 2,
          fontSize + padding,
          3
        );
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, x, y + baseRadius + 6);
      }
    },
    [hoveredNode]
  );

  // Animated link rendering
  const linkCanvasObject = useCallback(
    (link: any, ctx: CanvasRenderingContext2D) => {
      const source = link.source;
      const target = link.target;
      if (!source?.x || !target?.x) return;

      const time = Date.now() / 2000;
      const sourceColor = getChainColor(source.chainId);
      const targetColor = getChainColor(target.chainId);

      // Gradient line
      const grad = ctx.createLinearGradient(source.x, source.y, target.x, target.y);
      const alpha = link.value > 1 ? '20' : '0C';
      grad.addColorStop(0, `${sourceColor}${alpha}`);
      grad.addColorStop(1, `${targetColor}${alpha}`);

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth = link.value > 1 ? 1 : 0.3;
      ctx.stroke();

      // Traveling particle on cross-chain links
      if (link.value > 1) {
        const t = (time + link.source.score * 0.01) % 1;
        const px = source.x + (target.x - source.x) * t;
        const py = source.y + (target.y - source.y) * t;
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, 2 * Math.PI);
        ctx.fillStyle = `${sourceColor}80`;
        ctx.fill();
      }
    },
    []
  );

  // Animate for a few seconds then stop to save battery/CPU
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    setSettled(false);
    const tick = () => {
      fgRef.current?.refresh?.();
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    // Stop continuous animation after 8s (sim is settled by then)
    const timer = setTimeout(() => {
      cancelAnimationFrame(animFrameRef.current);
      fgRef.current?.refresh?.();
      setSettled(true);
    }, 8000);
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      clearTimeout(timer);
    };
  }, [agents, chainFilter]);

  const activeChains = useMemo(() => {
    if (!agents) return [];
    const chains = new Set(agents.map((a) => a.chain_id));
    return Array.from(chains).sort();
  }, [agents]);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Nav />

      <div className="mx-auto max-w-7xl px-3 sm:px-4 pt-4 sm:pt-6 pb-2">
        <div className="flex flex-col gap-3 mb-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-semibold tracking-widest text-primary uppercase mb-0.5">
                Network
              </p>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Agent Trust Graph
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 hidden sm:block">
                Explore the ERC-8004 agent network. Click any node to view profile.
              </p>
            </div>

            {/* Hover/tap info — top right on mobile */}
            {hoveredNode && (
              <div className="flex items-center gap-1.5 text-xs sm:text-sm bg-black/60 rounded-lg px-2 py-1 border border-gray-800">
                <ChainIcon chainId={hoveredNode.chainId} size={12} />
                <span className="font-semibold text-white truncate max-w-[120px] sm:max-w-none">
                  {hoveredNode.name}
                </span>
                <span className="text-gray-500 tabular-nums">
                  {hoveredNode.score.toFixed(0)}
                </span>
              </div>
            )}
          </div>

          {/* Filters — horizontal scroll on mobile */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
            {CHAIN_FILTERS.map((cf) => (
              <button
                key={cf.value}
                onClick={() => setChainFilter(cf.value)}
                className={`rounded-md px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium transition-colors border whitespace-nowrap ${
                  chainFilter === cf.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-gray-800 text-gray-500 hover:border-primary/30 hover:text-gray-300'
                }`}
              >
                {cf.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Graph */}
      <div
        ref={containerRef}
        className="relative mx-auto max-w-7xl"
        style={{ height: 'calc(100vh - 180px)', minHeight: 400 }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-gray-500">Loading agent network...</p>
            </div>
          </div>
        ) : graphData.nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">No agents found for this filter.</p>
          </div>
        ) : (
          <ForceGraph2D
            ref={fgRef}
            graphData={graphData}
            width={dimensions.width}
            height={dimensions.height}
            backgroundColor="#0a0a0f"
            nodeCanvasObject={nodeCanvasObject as any}
            nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
              const radius = Math.max(5, Math.min(24, (node as GraphNode).score / 4));
              // Bigger hit area on mobile (min 20px tap target)
              const hitRadius = Math.max(20, radius + 8);
              ctx.beginPath();
              ctx.arc(node.x ?? 0, node.y ?? 0, hitRadius, 0, 2 * Math.PI);
              ctx.fillStyle = color;
              ctx.fill();
            }}
            linkCanvasObject={linkCanvasObject}
            onNodeClick={handleNodeClick as any}
            onNodeHover={(node: any) => setHoveredNode(node as GraphNode | null)}
            cooldownTicks={200}
            d3VelocityDecay={0.2}
            warmupTicks={50}
            enableZoomInteraction={true}
            enablePanInteraction={true}
          />
        )}

        {/* Chain legend */}
        {activeChains.length > 0 && (
          <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 rounded-lg border border-gray-800 bg-black/80 backdrop-blur-sm p-2 sm:p-3 space-y-1">
            <p className="text-[10px] font-medium tracking-wider text-gray-500 uppercase">
              Chains
            </p>
            {activeChains.map((chainId) => (
              <div key={chainId} className="flex items-center gap-2 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-full shadow-lg"
                  style={{
                    backgroundColor: getChainColor(chainId),
                    boxShadow: `0 0 6px ${getChainColor(chainId)}60`,
                  }}
                />
                <span className="text-gray-400">
                  {getChainName(chainId)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 rounded-lg border border-gray-800 bg-black/80 backdrop-blur-sm p-2 sm:p-3 text-right">
          <p className="text-[10px] font-medium tracking-wider text-gray-500 uppercase">
            Network
          </p>
          <p className="text-lg font-bold text-white">{graphData.nodes.length}</p>
          <p className="text-[10px] text-gray-500">agents</p>
          <p className="text-lg font-bold text-white mt-1">{graphData.links.length}</p>
          <p className="text-[10px] text-gray-500">connections</p>
        </div>
      </div>
    </div>
  );
}

// Color utilities
function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + Math.round(2.55 * percent));
  const g = Math.min(255, ((num >> 8) & 0x00ff) + Math.round(2.55 * percent));
  const b = Math.min(255, (num & 0x0000ff) + Math.round(2.55 * percent));
  return `rgb(${r},${g},${b})`;
}

function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - Math.round(2.55 * percent));
  const g = Math.max(0, ((num >> 8) & 0x00ff) - Math.round(2.55 * percent));
  const b = Math.max(0, (num & 0x0000ff) - Math.round(2.55 * percent));
  return `rgb(${r},${g},${b})`;
}
