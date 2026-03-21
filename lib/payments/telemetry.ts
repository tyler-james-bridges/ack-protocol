/**
 * Payment telemetry for ACK Protocol.
 *
 * Lightweight event tracking for payment method selection and outcomes.
 * Hooks into Vercel Analytics when available, falls back to console in dev.
 */

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

/**
 * Track a payment event. Uses Vercel Analytics `track()` when available,
 * otherwise logs to console in development.
 */
export function trackPaymentEvent(
  event: PaymentEvent,
  data: PaymentEventData
): void {
  const payload = {
    event,
    ...data,
    timestamp: Date.now(),
  };

  // Vercel Analytics custom events
  if (typeof window !== 'undefined' && 'va' in window) {
    try {
      // @ts-expect-error Vercel Analytics global
      window.va?.track(event, payload);
    } catch {
      // Silently fail if VA not initialized
    }
  }

  // Dev logging
  if (process.env.NODE_ENV === 'development') {
    console.log(`[payment-telemetry] ${event}`, payload);
  }
}

/**
 * Create a timer for measuring payment duration.
 */
export function createPaymentTimer(): { elapsed: () => number } {
  const start = Date.now();
  return {
    elapsed: () => Date.now() - start,
  };
}
