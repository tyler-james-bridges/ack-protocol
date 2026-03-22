import { describe, it, expect, vi } from 'vitest';
import { checkMppPreflight } from '../mpp-preflight';

describe('checkMppPreflight', () => {
  it('returns not viable when walletClient is null', async () => {
    const result = await checkMppPreflight(null);
    expect(result.viable).toBe(false);
    expect(result.code).toBe('NO_WALLET');
    expect(result.reason).toContain('Connect a wallet');
  });

  it('returns not viable when walletClient is undefined', async () => {
    const result = await checkMppPreflight(undefined);
    expect(result.viable).toBe(false);
    expect(result.code).toBe('NO_WALLET');
  });

  it('returns not viable when account is missing', async () => {
    const result = await checkMppPreflight({ account: null });
    expect(result.viable).toBe(false);
    expect(result.code).toBe('NO_ACCOUNT');
    expect(result.reason).toContain('no active account');
  });

  it('returns viable for non-json-rpc accounts (privateKey/local)', async () => {
    const result = await checkMppPreflight({
      account: { type: 'local', address: '0x123' },
    });
    expect(result.viable).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('returns viable when json-rpc wallet is already on Tempo chain', async () => {
    const walletClient = {
      account: { type: 'json-rpc', address: '0xabc' },
      chain: { id: 978658 },
      request: vi.fn(),
    };

    const result = await checkMppPreflight(walletClient);
    expect(result.viable).toBe(true);
    // Should NOT have attempted a chain switch since already on Tempo
    expect(walletClient.request).not.toHaveBeenCalled();
  });

  it('returns not viable with TEMPO_CHAIN_NOT_ADDED on 4902', async () => {
    const walletClient = {
      account: { type: 'json-rpc', address: '0xabc' },
      chain: { id: 1 },
      request: vi.fn().mockRejectedValue({ code: 4902 }),
    };

    const result = await checkMppPreflight(walletClient);
    expect(result.viable).toBe(false);
    expect(result.code).toBe('TEMPO_CHAIN_NOT_ADDED');
    expect(result.reason).toContain('Tempo network not configured');
  });

  it('returns not viable with TEMPO_SWITCH_REJECTED on 4001', async () => {
    const walletClient = {
      account: { type: 'json-rpc', address: '0xabc' },
      chain: { id: 1 },
      request: vi.fn().mockRejectedValue({ code: 4001 }),
    };

    const result = await checkMppPreflight(walletClient);
    expect(result.viable).toBe(false);
    expect(result.code).toBe('TEMPO_SWITCH_REJECTED');
  });

  it('returns not viable with TEMPO_SWITCH_UNSUPPORTED on unknown error code', async () => {
    const walletClient = {
      account: { type: 'json-rpc', address: '0xabc' },
      chain: { id: 1 },
      request: vi.fn().mockRejectedValue({ code: -32601 }),
    };

    const result = await checkMppPreflight(walletClient);
    expect(result.viable).toBe(false);
    expect(result.code).toBe('TEMPO_SWITCH_UNSUPPORTED');
  });

  it('switches back to original chain after successful probe', async () => {
    const calls: string[] = [];
    const walletClient = {
      account: { type: 'json-rpc', address: '0xabc' },
      chain: { id: 1 },
      request: vi.fn().mockImplementation(({ method, params }) => {
        calls.push(`${method}:${JSON.stringify(params)}`);
        return Promise.resolve(null);
      }),
    };

    const result = await checkMppPreflight(walletClient);
    expect(result.viable).toBe(true);
    // Should have called switch twice: to Tempo, then back to original
    expect(walletClient.request).toHaveBeenCalledTimes(2);
    expect(calls[0]).toContain('0xeeee2'); // Tempo chainId in hex
    expect(calls[1]).toContain('0x1'); // Original chain back
  });
});
