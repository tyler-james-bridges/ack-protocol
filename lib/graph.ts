import type { ScanAgent } from '@/lib/api';

export interface GraphNode {
  id: string;
  name: string;
  imageUrl: string | null;
  chainId: number;
  score: number;
  feedbacks: number;
  tokenId: string;
  x?: number;
  y?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  value: number;
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
 * Build a visually interesting graph from agent data.
 * 
 * Strategy: sparse connections that create clusters by chain
 * with cross-chain bridges for agents that have feedback.
 * Fewer links = more spread = better visual.
 */
export function buildGraphData(agents: ScanAgent[]): GraphData {
  const nodes: GraphNode[] = agents
    .filter((a) => !a.is_testnet && a.total_score > 0)
    .map((a) => ({
      id: `${a.chain_id}:${a.token_id}`,
      name: a.name,
      imageUrl: a.image_url,
      chainId: a.chain_id,
      score: a.total_score,
      feedbacks: a.total_feedbacks,
      tokenId: a.token_id,
    }));

  const links: GraphLink[] = [];

  // Group by chain
  const byChain = new Map<number, GraphNode[]>();
  for (const node of nodes) {
    const arr = byChain.get(node.chainId) || [];
    arr.push(node);
    byChain.set(node.chainId, arr);
  }

  // Intra-chain: create a chain (linked list) through score-sorted nodes
  // This creates organic chain-like clusters instead of dense blobs
  for (const [, chainNodes] of byChain) {
    const sorted = [...chainNodes].sort((a, b) => b.score - a.score);
    for (let i = 0; i < sorted.length - 1; i++) {
      links.push({
        source: sorted[i].id,
        target: sorted[i + 1].id,
        value: 1,
      });
    }
    // Add a few skip connections for the top agents (creates triangles)
    for (let i = 0; i < Math.min(5, sorted.length - 2); i++) {
      links.push({
        source: sorted[i].id,
        target: sorted[i + 2].id,
        value: 1,
      });
    }
  }

  // Cross-chain bridges: connect top agent of each chain to top of others
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
        value: 2,
      });
    }
  }

  // Cross-chain links for agents with feedback
  const withFeedback = nodes.filter((n) => n.feedbacks > 0);
  for (let i = 0; i < withFeedback.length; i++) {
    for (let j = i + 1; j < Math.min(i + 3, withFeedback.length); j++) {
      if (withFeedback[i].chainId !== withFeedback[j].chainId) {
        links.push({
          source: withFeedback[i].id,
          target: withFeedback[j].id,
          value: 2,
        });
      }
    }
  }

  return { nodes, links };
}
