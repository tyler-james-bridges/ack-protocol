import type { ScanAgent } from '@/lib/api';

export interface GraphNode {
  id: string;
  name: string;
  chainId: number;
  score: number;
  feedbacks: number;
  tokenId: string;
  color: string;
  val: number; // node size for force-graph
  x?: number;
  y?: number;
  z?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  color: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

const CHAIN_COLORS: Record<number, string> = {
  1: '#627EEA',
  2741: '#00DE73',
  8453: '#0052FF',
  42161: '#28A0F0',
  137: '#8247E5',
  56: '#F0B90B',
  10: '#FF0420',
  43114: '#E84142',
};

export function getChainColor(chainId: number): string {
  return CHAIN_COLORS[chainId] || '#6B7280';
}

/**
 * Build 3D graph data. Sparse connections create visible structure.
 * Chain-based clusters with cross-chain bridges.
 */
export function buildGraphData(agents: ScanAgent[]): GraphData {
  const valid = agents.filter((a) => !a.is_testnet && a.total_score > 0);

  const nodes: GraphNode[] = valid.map((a) => ({
    id: `${a.chain_id}:${a.token_id}`,
    name: a.name,
    chainId: a.chain_id,
    score: a.total_score,
    feedbacks: a.total_feedbacks,
    tokenId: a.token_id,
    color: getChainColor(a.chain_id),
    val: Math.max(2, a.total_score / 8),
  }));

  const links: GraphLink[] = [];

  // Group by chain
  const byChain = new Map<number, GraphNode[]>();
  for (const node of nodes) {
    const arr = byChain.get(node.chainId) || [];
    arr.push(node);
    byChain.set(node.chainId, arr);
  }

  // Intra-chain: linked list + skip connections
  for (const [, chainNodes] of byChain) {
    const sorted = [...chainNodes].sort((a, b) => b.score - a.score);
    for (let i = 0; i < sorted.length - 1; i++) {
      links.push({
        source: sorted[i].id,
        target: sorted[i + 1].id,
        color: `${sorted[i].color}40`,
      });
    }
    // Skip connections for top nodes
    for (let i = 0; i < Math.min(4, sorted.length - 2); i++) {
      links.push({
        source: sorted[i].id,
        target: sorted[i + 2].id,
        color: `${sorted[i].color}25`,
      });
    }
  }

  // Cross-chain bridges between top agents
  const chainTops: GraphNode[] = [];
  for (const [, chainNodes] of byChain) {
    const top = chainNodes.reduce((a, b) => (a.score > b.score ? a : b));
    chainTops.push(top);
  }
  for (let i = 0; i < chainTops.length; i++) {
    for (let j = i + 1; j < chainTops.length; j++) {
      links.push({
        source: chainTops[i].id,
        target: chainTops[j].id,
        color: 'rgba(255,255,255,0.08)',
      });
    }
  }

  return { nodes, links };
}
