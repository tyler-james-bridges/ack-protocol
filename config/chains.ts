import { createPublicClient, http, type Chain, type PublicClient } from 'viem';
import { mainnet, base, bsc, gnosis, celo } from 'viem/chains';
import { abstract } from 'viem/chains';

export interface ChainMeta {
  chain: Chain;
  color: string;
  explorerUrl: string;
}

const chainMetas: ChainMeta[] = [
  { chain: abstract, color: '#00FF94', explorerUrl: 'https://abscan.org' },
  { chain: base, color: '#0052FF', explorerUrl: 'https://basescan.org' },
  { chain: bsc, color: '#F0B90B', explorerUrl: 'https://bscscan.com' },
  { chain: mainnet, color: '#627EEA', explorerUrl: 'https://etherscan.io' },
  { chain: celo, color: '#FCFF52', explorerUrl: 'https://celoscan.io' },
  { chain: gnosis, color: '#04795B', explorerUrl: 'https://gnosisscan.io' },
];

export const SUPPORTED_CHAINS = chainMetas;

const clients = new Map<number, PublicClient>();

export function getPublicClient(chainId: number): PublicClient {
  const existing = clients.get(chainId);
  if (existing) return existing;

  const meta = chainMetas.find((m) => m.chain.id === chainId);
  if (!meta) throw new Error(`Unsupported chain: ${chainId}`);

  const client = createPublicClient({
    chain: meta.chain,
    transport: http(),
  });
  clients.set(chainId, client);
  return client;
}
