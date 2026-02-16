import { createPublicClient, http, type Chain, type PublicClient } from 'viem';
import {
  mainnet,
  base,
  bsc,
  gnosis,
  celo,
  arbitrum,
  optimism,
  polygon,
  scroll,
  avalanche,
  linea,
  taiko,
} from 'viem/chains';
import { abstract } from 'viem/chains';

const xlayer: Chain = {
  id: 196,
  name: 'X Layer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.xlayer.tech'] } },
  blockExplorers: {
    default: { name: 'XLayerScan', url: 'https://xlayerscan.com' },
  },
};

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
  { chain: arbitrum, color: '#28A0F0', explorerUrl: 'https://arbiscan.io' },
  {
    chain: optimism,
    color: '#FF0420',
    explorerUrl: 'https://optimistic.etherscan.io',
  },
  { chain: polygon, color: '#8247E5', explorerUrl: 'https://polygonscan.com' },
  { chain: scroll, color: '#FFEEDA', explorerUrl: 'https://scrollscan.com' },
  { chain: avalanche, color: '#E84142', explorerUrl: 'https://snowscan.xyz' },
  { chain: linea, color: '#61DFFF', explorerUrl: 'https://lineascan.build' },
  { chain: taiko, color: '#E81899', explorerUrl: 'https://taikoscan.io' },
  { chain: xlayer, color: '#FFFFFF', explorerUrl: 'https://xlayerscan.com' },
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
