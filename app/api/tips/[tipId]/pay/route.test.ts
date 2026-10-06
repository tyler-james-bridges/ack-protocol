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
import { getTip, resolvePaymentAddress } from '@/lib/tip-store';
import { GET } from './route';

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
  });
});
