import { NextResponse } from 'next/server';
import { facilitatorRejectionReason } from '@/lib/payments/x402-errors';

export function requestAttemptedX402Payment(headers: {
  get(name: string): string | null;
}): boolean {
  return Boolean(headers.get('payment-signature') || headers.get('x-payment'));
}

/**
 * Copy a facilitator rejection into the 402 JSON body.
 *
 * `@x402/next` returns `{ }` and puts the reason only in `PAYMENT-REQUIRED`
 * or `PAYMENT-RESPONSE`. Clients that read `response.error` then have nothing
 * to show.
 */
export async function withFacilitatorRejectionBody(
  response: NextResponse,
  attemptedPayment: boolean
): Promise<NextResponse> {
  if (!attemptedPayment || response.status !== 402) return response;

  const reason = facilitatorRejectionReason(response.headers);
  if (!reason) return response;

  let existing: Record<string, unknown> = {};
  const text = await response.clone().text();
  if (text) {
    try {
      const parsed = JSON.parse(text) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        existing = parsed as Record<string, unknown>;
      }
    } catch {
      existing = {};
    }
  }

  if (typeof existing.error === 'string' && existing.error.trim()) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('content-type', 'application/json');

  return NextResponse.json(
    { ...existing, error: reason },
    { status: 402, headers }
  );
}
