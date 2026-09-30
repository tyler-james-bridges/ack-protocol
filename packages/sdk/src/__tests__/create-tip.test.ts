import { afterEach, describe, expect, it, vi } from 'vitest';
import { ACK } from '../client';

describe('createTip', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts chainId 8453 when the caller omits it', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tipId: 'tip_1' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const ack = ACK.readonly({ baseUrl: 'https://ack.example' });
    await ack.createTip({
      agentId: 606,
      fromAddress: '0x1111111111111111111111111111111111111111',
      amountUsd: 1,
    });

    const call = fetchMock.mock.calls[0];
    if (!call) throw new Error('fetch was not called');
    const body = JSON.parse(call[1].body as string);
    expect(call[0]).toBe('https://ack.example/api/tips');
    expect(body.chainId).toBe(8453);
    expect(body.amountUsd).toBe(1);
    expect(body.fromAddress).toBe('0x1111111111111111111111111111111111111111');
  });
});
