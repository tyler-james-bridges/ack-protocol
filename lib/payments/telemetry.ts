import { track } from '@vercel/analytics';
import type { PaymentMethodId } from './discovery';

export type PaymentEvent =
  | 'payment_method_selected'
  | 'payment_attempted'
  | 'payment_succeeded'
  | 'payment_failed';

export interface PaymentEventData {
  method: PaymentMethodId;
  tipId: string;
  amountUsd?: number;
  error?: string;
  durationMs?: number;
}

export function trackPaymentEvent(
  event: PaymentEvent,
  data: PaymentEventData
): void {
  if (typeof window !== 'undefined') track(event, { method: data.method });

  if (process.env.NODE_ENV === 'development') {
    console.log(`[payment-telemetry] ${event}`, {
      event,
      ...data,
      timestamp: Date.now(),
    });
  }
}

export function createPaymentTimer(): { elapsed: () => number } {
  const start = Date.now();
  return {
    elapsed: () => Date.now() - start,
  };
}
