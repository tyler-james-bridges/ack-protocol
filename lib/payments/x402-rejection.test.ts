import { NextResponse } from 'next/server';
import { describe, expect, it } from 'vitest';
import { withFacilitatorRejectionBody } from './x402-rejection';

function encoded(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64');
}

function rejected(body: unknown, header: unknown): NextResponse {
  return new NextResponse(JSON.stringify(body), {
    status: 402,
    headers: {
      'Content-Type': 'application/json',
      'PAYMENT-REQUIRED': encoded(header),
    },
  });
}

describe('withFacilitatorRejectionBody', () => {
  it('puts the facilitator reason on an empty 402 body', async () => {
    const response = rejected(
      {},
      { x402Version: 2, error: 'address_not_registered' }
    );
    const next = await withFacilitatorRejectionBody(response, true);

    expect(next.status).toBe(402);
    expect(await next.json()).toEqual({ error: 'address_not_registered' });
    expect(next.headers.get('payment-required')).toBe(
      response.headers.get('payment-required')
    );
  });

  it('leaves the unpaid challenge body empty', async () => {
    const response = rejected({}, { error: 'Payment required' });
    const next = await withFacilitatorRejectionBody(response, false);
    expect(await next.json()).toEqual({});
  });

  it('does not treat the challenge text as a facilitator rejection', async () => {
    const response = rejected(
      {},
      { error: 'PAYMENT-SIGNATURE header is required' }
    );
    const next = await withFacilitatorRejectionBody(response, true);
    expect(await next.json()).toEqual({});
  });

  it('keeps an error the route already wrote', async () => {
    const response = rejected(
      { error: 'PAYMENT_PROOF_REPLAYED' },
      { error: 'address_not_registered' }
    );
    const next = await withFacilitatorRejectionBody(response, true);
    expect(await next.json()).toEqual({ error: 'PAYMENT_PROOF_REPLAYED' });
  });
});
