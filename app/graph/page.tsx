'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Nav } from '@/components/nav';
import { ChainIcon } from '@/components/chain-icon';
import { useLeaderboard, getChainName } from '@/hooks';
import { buildGraphData, getChainColor, type GraphNode } from '@/lib/graph';

const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), {
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
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [chainFilter, setChainFilter] = useState(0);
  const [hoveredAgent, setHoveredAgent] = useState<GraphNode | null>(null);

  const { data: agents, isLoading } = useLeaderboard({ limit: 100 });

  const graphData = useMemo(() => {
    if (!agents) return { nodes: [], links: [] };
    const filtered =
      chainFilter === 0
        ? agents
        : agents.filter((a) => a.chain_id === chainFilter);
    return buildGraphData(filtered);
  }, [agents, chainFilter]);

  // Resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height: Math.max(height, 400) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Configure forces after mount
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.d3Force('charge')?.strength(-120).distanceMax(400);
    fg.d3Force('link')?.distance(60).strength(0.15);
  }, [graphData]);

  // Auto-rotate camera
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    // Set camera distance
    setTimeout(() => {
      fg.cameraPosition({ z: 500 });
    }, 500);
  }, [graphData]);

  const handleNodeClick = useCallback(
    (node: any) => {
      const n = node as GraphNode;
      // Fly to node then navigate
      const fg = fgRef.current;
      if (fg) {
        const distance = 80;
        const distRatio = 1 + distance / Math.hypot(n.x || 0, n.y || 0, n.z || 0);
        fg.cameraPosition(
          { x: (n.x || 0) * distRatio, y: (n.y || 0) * distRatio, z: (n.z || 0) * distRatio },
          { x: n.x, y: n.y, z: n.z },
          1000
        );
        setTimeout(() => {
          router.push(`/agent/${n.chainId}/${n.tokenId}`);
        }, 1200);
      }
    },
    [router]
  );

  const activeChains = useMemo(() => {
    if (!agents) return [];
    return Array.from(new Set(agents.map((a) => a.chain_id))).sort();
  }, [agents]);

  return (
    <div className="min-h-screen bg-[#040408]">
      <Nav />

      <div className="mx-auto max-w-7xl px-3 sm:px-4 pt-3 sm:pt-4 pb-1">
        <div className="flex flex-col gap-2 mb-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-semibold tracking-widest text-primary uppercase mb-0.5">
                Network
              </p>
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-white">
                Agent Trust Graph
              </h1>
            </div>

            {hoveredAgent && (
              <div className="flex items-center gap-1.5 text-xs bg-black/70 rounded-lg px-2.5 py-1.5 border border-gray-800 backdrop-blur-sm">
                <ChainIcon chainId={hoveredAgent.chainId} size={12} />
                <span className="font-semibold text-white truncate max-w-[140px]">
                  {hoveredAgent.name}
                </span>
                <span className="text-gray-500 tabular-nums">
                  {hoveredAgent.score.toFixed(0)}
                </span>
                {hoveredAgent.feedbacks > 0 && (
                  <span className="text-primary text-[10px]">
                    {hoveredAgent.feedbacks} kudos
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {CHAIN_FILTERS.map((cf) => (
              <button
                key={cf.value}
                onClick={() => setChainFilter(cf.value)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors border whitespace-nowrap ${
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

      <div
        ref={containerRef}
        className="relative mx-auto max-w-7xl"
        style={{ height: 'calc(100vh - 140px)', minHeight: 400 }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-gray-500">Scanning agent network...</p>
            </div>
          </div>
        ) : graphData.nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">No agents found for this filter.</p>
          </div>
        ) : (
          <ForceGraph3D
            ref={fgRef}
            graphData={graphData}
            width={dimensions.width}
            height={dimensions.height}
            backgroundColor="#040408"
            showNavInfo={false}
            // Nodes
            nodeLabel=""
            nodeColor={(node: any) => (node as GraphNode).color}
            nodeVal={(node: any) => (node as GraphNode).val}
            nodeOpacity={0.9}
            nodeResolution={16}
            // Links
            linkColor={(link: any) => (link as any).color || 'rgba(255,255,255,0.05)'}
            linkWidth={0.5}
            linkOpacity={0.6}
            linkDirectionalParticles={(link: any) => {
              // Particles on cross-chain links
              const color = (link as any).color || '';
              return color.includes('rgba') ? 2 : 0;
            }}
            linkDirectionalParticleWidth={1.5}
            linkDirectionalParticleSpeed={0.005}
            linkDirectionalParticleColor={() => '#00DE73'}
            // Interaction
            onNodeClick={handleNodeClick}
            onNodeHover={(node: any) => setHoveredAgent(node as GraphNode | null)}
            enableNodeDrag={true}
            enableNavigationControls={true}
            cooldownTicks={150}
            d3VelocityDecay={0.3}
            warmupTicks={30}
          />
        )}

        {/* Chain legend */}
        {activeChains.length > 0 && (
          <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 rounded-lg border border-gray-800/50 bg-black/70 backdrop-blur-sm p-2 sm:p-3 space-y-1">
            <p className="text-[9px] font-medium tracking-wider text-gray-600 uppercase">
              Chains
            </p>
            {activeChains.map((chainId) => (
              <div key={chainId} className="flex items-center gap-2 text-[11px]">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: getChainColor(chainId),
                    boxShadow: `0 0 6px ${getChainColor(chainId)}80`,
                  }}
                />
                <span className="text-gray-500">
                  {getChainName(chainId)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 rounded-lg border border-gray-800/50 bg-black/70 backdrop-blur-sm p-2 sm:p-3 text-right">
          <p className="text-[9px] font-medium tracking-wider text-gray-600 uppercase">
            Tracking
          </p>
          <p className="text-lg font-bold text-white tabular-nums">{graphData.nodes.length}</p>
          <p className="text-[10px] text-gray-600">agents</p>
        </div>

        {/* Instructions */}
        <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 text-[10px] text-gray-700">
          Drag to rotate · Scroll to zoom · Click node to view agent
        </div>
      </div>
    </div>
  );
}
