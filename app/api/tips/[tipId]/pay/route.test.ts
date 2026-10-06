import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/x402', () => ({
  withPayment: vi.fn(),
}));

vi.mock('@/lib/tip-store', () => ({
  getTip: vi.fn(),
  completeTip: vi.fn(),
  tipToJSON: (tip: unknown) => tip,
  resolvePaymentAddress: vi.fn(),
}));

vi.mock('@/lib/payments/mpp', () => ({
  mppEnabled: () => false,
  buildMppChallenge: vi.fn(),
  buildMppChallengeResponse: vi.fn(),
  getMppConfig: vi.fn(),
  verifyMppCredential: vi.fn(),
}));

import { withPayment } from '@/lib/x402';
import { completeTip, getTip, resolvePaymentAddress } from '@/lib/tip-store';
import { GET } from './route';

const SETTLEMENT_TX =
  '0xd2f76f380901785842b4d8f9d539f7b8b84a2a0fa415bac2cec725947a2a10e1';

function encoded(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64');
}

describe('GET /api/tips/[tipId]/pay facilitator rejection', () => {
  beforeEach(() => {
    vi.mocked(getTip).mockResolvedValue({
      id: 'tip_2290',
      status: 'pending',
      amountUsd: 1,
      agentId: 2290,
      chainId: 8453,
    } as Awaited<ReturnType<typeof getTip>>);
    vi.mocked(resolvePaymentAddress).mockResolvedValue(
      '0x715Dc035fFb97dD7bB4095C6670138BA05BB4E6d'
    );
    vi.mocked(completeTip).mockClear();
  });

  it('copies the facilitator reason into the 402 body', async () => {
    vi.mocked(withPayment).mockReturnValue(async () => {
      return new NextResponse('{}', {
        status: 402,
        headers: {
          'Content-Type': 'application/json',
          'PAYMENT-REQUIRED': encoded({
            x402Version: 2,
            error: 'address_not_registered',
          }),
        },
      });
    });

    const request = new NextRequest(
      'http://localhost:3000/api/tips/tip_2290/pay',
      { headers: { 'payment-signature': 'signed-payload' } }
    );
    const response = await GET(request, {
      params: Promise.resolve({ tipId: 'tip_2290' }),
    });

    expect(response.status).toBe(402);
    expect(await response.json()).toEqual({ error: 'address_not_registered' });
    expect(response.headers.get('payment-required')).toBeTruthy();
    expect(completeTip).not.toHaveBeenCalled();
  });

  it('stores the facilitator settlement tx hash after settle', async () => {
    vi.mocked(withPayment).mockImplementation((routeHandler) => {
      return async (request: NextRequest) => {
        const verified = await routeHandler(request);
        const headers = new Headers(verified.headers);
        headers.set(
          'PAYMENT-RESPONSE',
          encoded({
            success: true,
            transaction: SETTLEMENT_TX,
            network: 'eip155:8453',
            payer: '0x668add9213985e7fd613aec87767c892f4b9df1c',
          })
        );
        return new NextResponse(await verified.text(), {
          status: verified.status,
          headers,
        });
      };
    });
    vi.mocked(completeTip).mockImplementation(async (_tipId, paymentTxHash) => {
      return {
        id: 'tip_2290',
        status: 'completed',
        paymentTxHash,
        amountUsd: 1,
        agentId: 2290,
        chainId: 8453,
        kudosTxHash: '',
        fromAddress: '0x668add9213985e7fd613aec87767c892f4b9df1c',
        toAddress: '0x715dc035ffb97dd7bb4095c6670138ba05bb4e6d',
        amountRaw: '1000000',
        createdAt: 1,
        completedAt: 2,
        expiresAt: 3,
      } as Awaited<ReturnType<typeof completeTip>>;
    });

    const request = new NextRequest(
      'http://localhost:3000/api/tips/tip_2290/pay',
      { headers: { 'payment-signature': 'signed-payload' } }
    );
    const response = await GET(request, {
      params: Promise.resolve({ tipId: 'tip_2290' }),
    });

    expect(completeTip).toHaveBeenCalledTimes(1);
    expect(completeTip).toHaveBeenCalledWith('tip_2290', SETTLEMENT_TX);
    expect(response.status).toBe(200);
    expect(response.headers.get('payment-response')).toBeTruthy();
    await expect(response.json()).resolves.toMatchObject({
      status: 'paid',
      tip: { paymentTxHash: SETTLEMENT_TX },
    });
  });

  it('keeps the placeholder when settle omits a tx hash', async () => {
    vi.mocked(withPayment).mockReturnValue(async () => {
      return NextResponse.json({ status: 'payment_verified' });
    });
    vi.mocked(completeTip).mockImplementation(async (_tipId, paymentTxHash) => {
      return {
        id: 'tip_2290',
        status: 'completed',
        paymentTxHash,
        amountUsd: 1,
      } as Awaited<ReturnType<typeof completeTip>>;
    });

    const request = new NextRequest(
      'http://localhost:3000/api/tips/tip_2290/pay',
      { headers: { 'payment-signature': 'signed-payload' } }
    );
    const response = await GET(request, {
      params: Promise.resolve({ tipId: 'tip_2290' }),
    });

    expect(completeTip).toHaveBeenCalledWith(
      'tip_2290',
      'x402-facilitator-settlement'
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      tip: { paymentTxHash: 'x402-facilitator-settlement' },
    });
  });
});
