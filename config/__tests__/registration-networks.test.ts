import { afterEach, expect, it, vi } from 'vitest';
import { switchChain } from 'wagmi/actions';
import { getBlockNumber } from 'viem/actions';
import { mainnet } from 'viem/chains';
import { getPublicClient, SUPPORTED_CHAINS } from '@/config/chains';
import { wagmiConfig } from '@/config/wagmi';

afterEach(() => {
  vi.unstubAllGlobals();
});

it('can select every registration network before connecting the wallet', async () => {
  const previous = wagmiConfig.state.chainId;
  try {
    for (const { chain } of SUPPORTED_CHAINS) {
      const selected = await switchChain(wagmiConfig, { chainId: chain.id });
      expect(selected.id).toBe(chain.id);
      expect(wagmiConfig.state.chainId).toBe(chain.id);
    }
  } finally {
    await switchChain(wagmiConfig, { chainId: previous });
  }
});

it('sends both wallet and public Ethereum reads to the browser RPC', async () => {
  const urls: string[] = [];
  vi.stubGlobal(
    'fetch',
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      urls.push(request.url);
      const { id, method } = await request.json();
      expect(method).toBe('eth_blockNumber');
      return Response.json({ jsonrpc: '2.0', id, result: '0x2a' });
    }
  );
  const rpc =
    process.env.NEXT_PUBLIC_ETH_RPC_URL ||
    'https://ethereum-rpc.publicnode.com';
  for (const client of [
    wagmiConfig.getClient({ chainId: mainnet.id }),
    getPublicClient(mainnet.id),
  ]) {
    expect(await getBlockNumber(client, { cacheTime: 0 })).toBe(BigInt(42));
  }
  expect(urls).toEqual([new URL(rpc).href, new URL(rpc).href]);
});
