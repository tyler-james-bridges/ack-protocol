import { describe, expect, it } from 'vitest';
import { createWalletClient, custom, type Hex } from 'viem';
import { base } from 'viem/chains';
import { ACK } from '../client.js';
import { BASE_DATA_SUFFIX } from '../builder-code.js';
import { DEFAULT_CHAIN_ID, toCAIP10Address } from '../constants.js';

const ERC_8021_MARKER = '8021'.repeat(8);
const ACCOUNT = '0x0000000000000000000000000000000000000001' as const;

describe('SDK Base defaults and attribution', () => {
  it('defaults numeric helpers to chain 8453', () => {
    expect(DEFAULT_CHAIN_ID).toBe(8453);
    expect(toCAIP10Address(ACCOUNT)).toContain('eip155:8453:');
  });

  it('suffix ends with the ERC-8021 marker', () => {
    expect(BASE_DATA_SUFFIX.toLowerCase().endsWith(ERC_8021_MARKER)).toBe(true);
  });

  it('defaults a private-key client to Base attribution', () => {
    const ack = ACK.fromPrivateKey(`0x${'cd'.repeat(32)}`);
    const wallet = (ack as unknown as { walletClient?: { dataSuffix?: Hex } })
      .walletClient;
    expect(wallet?.dataSuffix).toBe(BASE_DATA_SUFFIX);
  });

  it('puts dataSuffix on the Base wallet client created from a private key', () => {
    const ack = ACK.fromPrivateKey(`0x${'ab'.repeat(32)}`, { chain: 'base' });
    const wallet = (ack as unknown as { walletClient?: { dataSuffix?: Hex } })
      .walletClient;
    expect(wallet?.dataSuffix).toBe(BASE_DATA_SUFFIX);
  });

  it('omits dataSuffix for Abstract wallet clients', () => {
    const ack = ACK.fromPrivateKey(`0x${'ab'.repeat(32)}`, {
      chain: 'abstract',
    });
    const wallet = (ack as unknown as { walletClient?: { dataSuffix?: Hex } })
      .walletClient;
    expect(wallet?.dataSuffix).toBeUndefined();
  });

  it('appends the suffix once when the client and the call both set it', async () => {
    let sent: Hex | undefined;
    const wallet = createWalletClient({
      account: ACCOUNT,
      chain: base,
      dataSuffix: BASE_DATA_SUFFIX,
      transport: custom({
        async request({ method, params }) {
          if (method === 'eth_chainId') return '0x2105';
          if (method === 'eth_sendTransaction') {
            sent = (params as [{ data?: Hex }])[0].data;
            return `0x${'22'.repeat(32)}`;
          }
          throw new Error(`unexpected rpc ${method}`);
        },
      }),
    });

    await wallet.sendTransaction({
      to: ACCOUNT,
      data: '0xabcdef',
      dataSuffix: BASE_DATA_SUFFIX,
    });

    expect(sent).toBeDefined();
    const raw = sent!.toLowerCase();
    expect(raw.startsWith('0xabcdef')).toBe(true);
    expect(raw.endsWith(ERC_8021_MARKER)).toBe(true);
    expect(raw.split(ERC_8021_MARKER).length - 1).toBe(1);
  });
});
