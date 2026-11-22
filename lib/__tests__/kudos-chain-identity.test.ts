import { NextRequest } from 'next/server';
import { afterEach, expect, it, vi } from 'vitest';
import {
  encodeAbiParameters,
  encodeEventTopics,
  parseAbiParameters,
  zeroAddress,
  zeroHash,
} from 'viem';
import { GET } from '@/app/api/kudos/[txHash]/route';
import { REPUTATION_REGISTRY_ABI } from '@/config/abi';
import { getChainConfig } from '@/config/chain';
import { REPUTATION_REGISTRY_ADDRESS } from '@/config/contract';
import { handleKudosTool } from '@/lib/tools/kudos-handler';

afterEach(() => vi.unstubAllGlobals());

it('receipts for the same token number keep the name from their own chain', async () => {
  const tokenId = 606;
  const chains = [
    { chainId: 2741, name: 'Abstract Agent', hash: '0x' + 'a'.repeat(64) },
    { chainId: 8453, name: 'Base Agent', hash: '0x' + 'b'.repeat(64) },
  ];
  const log = {
    address: REPUTATION_REGISTRY_ADDRESS,
    transactionLogIndex: '0x0',
    topics: encodeEventTopics({
      abi: REPUTATION_REGISTRY_ABI,
      eventName: 'NewFeedback',
      args: {
        agentId: BigInt(tokenId),
        clientAddress: zeroAddress,
        indexedTag1: 'kudos',
      },
    }),
    data: encodeAbiParameters(
      parseAbiParameters(
        'uint64, int128, uint8, string, string, string, string, bytes32'
      ),
      [BigInt(1), BigInt(1), 0, 'kudos', '', '', '', zeroHash]
    ),
  };
  vi.stubGlobal(
    'fetch',
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      if (url.hostname.endsWith('8004scan.io')) {
        const listedChain = Number(url.searchParams.get('chainId'));
        const listed = chains.find((chain) => chain.chainId === listedChain);
        const agent = (chain: (typeof chains)[number]) => ({
          chain_id: chain.chainId,
          token_id: String(tokenId),
          name: chain.name,
        });
        if (url.pathname.endsWith('/agents') && listed)
          return Response.json({ items: [agent(listed)] });
        const detail = chains.find(({ chainId }) =>
          url.pathname.endsWith('/agents/' + chainId + '/' + tokenId)
        );
        return detail
          ? Response.json(agent(detail))
          : new Response(null, { status: 404 });
      }
      const owner = chains.find(
        ({ chainId }) =>
          new URL(getChainConfig(chainId).rpcUrl).host === url.host
      );
      const { id, method, params } = await request.json();
      let result;
      if (method === 'eth_getTransactionReceipt') {
        result =
          owner?.hash === params[0]
            ? { status: '0x1', blockNumber: '0x1', logs: [log], l2ToL1Logs: [] }
            : null;
      } else if (method === 'eth_getBlockByNumber') {
        result = { timestamp: '0x1', transactions: [] };
      } else throw new Error('Unexpected RPC method ' + method);
      return Response.json({ jsonrpc: '2.0', id, result });
    }
  );
  for (const { chainId, hash, name } of chains) {
    const response = await GET(
      new NextRequest('https://ack.test/api/kudos/' + hash),
      {
        params: Promise.resolve({ txHash: hash }),
      }
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      agentId: tokenId,
      chainId,
      agentName: name,
    });
    const result = await handleKudosTool({
      action: 'kudos_detail',
      txHash: hash,
      chainId,
    });
    expect(result).toMatchObject({
      status: 200,
      body: { kudos: { agentId: tokenId, agentName: name } },
    });
  }
});
