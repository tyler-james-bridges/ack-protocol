import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createWalletClient, custom, encodeFunctionData, type Hex } from 'viem';
import { abstract, base } from 'viem/chains';
import { REPUTATION_REGISTRY_ABI } from '@/config/abi';
import { DEFAULT_8004_CHAIN_ID } from '@/config/chain';
import {
  BASE_BUILDER_CODE,
  BASE_DATA_SUFFIX,
  ERC_8021_MARKER,
  appendBuilderCodeCalldata,
  calldataHasErc8021Suffix,
} from '@/config/builder-code';

const ACCOUNT = '0x0000000000000000000000000000000000000001' as const;

const BUILDER_CODE_SOURCES = [
  'config/builder-code.ts',
  'packages/sdk/src/builder-code.ts',
  'packages/agentkit-provider/src/builder-code.ts',
  'scripts/builder-code.mjs',
  'services/acp-cli-v2/src/lib/builder-code.ts',
  'services/twitter-agent/src/builder-code.ts',
];

async function captureSend(
  chain: typeof base | typeof abstract,
  dataSuffix?: Hex
) {
  let sent: Hex | undefined;
  const wallet = createWalletClient({
    account: ACCOUNT,
    chain,
    transport: custom({
      async request({ method, params }) {
        if (method === 'eth_chainId') return `0x${chain.id.toString(16)}`;
        if (method === 'eth_sendTransaction') {
          const tx = (params as [{ data?: Hex }])[0];
          sent = tx.data;
          return `0x${'11'.repeat(32)}`;
        }
        throw new Error(`unexpected rpc ${method}`);
      },
    }),
    dataSuffix,
  });

  await wallet.sendTransaction({
    to: ACCOUNT,
    data: '0x1234',
    dataSuffix,
  });
  return sent;
}

describe('Base builder code', () => {
  it('centralizes bc_jhxtiha3 across attribution modules', () => {
    expect(BASE_BUILDER_CODE).toBe('bc_jhxtiha3');
    for (const relativePath of BUILDER_CODE_SOURCES) {
      const source = readFileSync(join(process.cwd(), relativePath), 'utf8');
      expect(source).toContain("'bc_jhxtiha3'");
    }
  });

  it('encodes an ERC-8021 suffix that ends with the 8021 marker', () => {
    expect(BASE_DATA_SUFFIX.toLowerCase().endsWith(ERC_8021_MARKER)).toBe(true);
    expect(calldataHasErc8021Suffix(BASE_DATA_SUFFIX)).toBe(true);
  });

  it('appends the suffix on Base calldata and leaves Abstract alone', () => {
    const data = encodeFunctionData({
      abi: REPUTATION_REGISTRY_ABI,
      functionName: 'revokeFeedback',
      args: [BigInt(1), ACCOUNT, BigInt(0)],
    });

    const onBase = appendBuilderCodeCalldata(data, 8453);
    const onAbstract = appendBuilderCodeCalldata(data, 2741);

    expect(onBase.toLowerCase().endsWith(ERC_8021_MARKER)).toBe(true);
    expect(onBase.startsWith(data)).toBe(true);
    expect(onAbstract).toBe(data);
    expect(calldataHasErc8021Suffix(onAbstract)).toBe(false);
    expect(appendBuilderCodeCalldata(onBase, 8453)).toBe(onBase);
  });

  it('appends the suffix once through a Base viem wallet client', async () => {
    const sent = await captureSend(base, BASE_DATA_SUFFIX);
    expect(sent).toBeDefined();
    const hex = sent!.toLowerCase();
    expect(hex.endsWith(ERC_8021_MARKER)).toBe(true);
    expect(hex.split(ERC_8021_MARKER).length - 1).toBe(1);
    expect(hex.startsWith('0x1234')).toBe(true);
  });

  it('does not append the suffix on an Abstract viem wallet client', async () => {
    const sent = await captureSend(abstract);
    expect(sent).toBe('0x1234');
  });
});

describe('default chain', () => {
  it('resolves the app default to Base mainnet', () => {
    expect(DEFAULT_8004_CHAIN_ID).toBe(8453);
  });
});
