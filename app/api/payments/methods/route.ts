import { NextResponse } from 'next/server';
import { mppEnabled } from '@/lib/payments/mpp';
import {
  PAYMENT_METHODS,
  type PaymentMethod,
  type PaymentMethodId,
  type PaymentMethodsResponse,
} from '@/lib/payments/discovery';

/**
 * GET /api/payments/methods
 *
 * Discovery endpoint for available payment methods.
 * Returns which rails are enabled and their metadata so the frontend
 * can render the payment UI without hardcoding method availability.
 */
export async function GET() {
  const methods: PaymentMethod[] = [
    { ...PAYMENT_METHODS.x402, enabled: true },
    { ...PAYMENT_METHODS.mpp, enabled: mppEnabled() },
    { ...PAYMENT_METHODS.direct, enabled: true },
  ];

  const enabledMethods = methods.filter((m) => m.enabled);
  const defaultMethod: PaymentMethodId = mppEnabled() ? 'x402' : 'x402';

  const response: PaymentMethodsResponse = {
    methods: enabledMethods,
    defaultMethod,
  };

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
