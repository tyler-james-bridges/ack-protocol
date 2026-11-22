import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { trackPaymentEvent, createPaymentTimer } from './telemetry';

describe('trackPaymentEvent', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('logs event in development', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    trackPaymentEvent('payment_method_selected', {
      method: 'x402',
      tipId: 'test-tip-123',
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      '[payment-telemetry] payment_method_selected',
      expect.objectContaining({
        event: 'payment_method_selected',
        method: 'x402',
        tipId: 'test-tip-123',
        timestamp: expect.any(Number),
      })
    );

    consoleSpy.mockRestore();
  });

  it('includes optional fields when provided', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    trackPaymentEvent('payment_failed', {
      method: 'mpp',
      tipId: 'test-tip-456',
      amountUsd: 1.5,
      error: 'Insufficient funds',
      durationMs: 3200,
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      '[payment-telemetry] payment_failed',
      expect.objectContaining({
        method: 'mpp',
        amountUsd: 1.5,
        error: 'Insufficient funds',
        durationMs: 3200,
      })
    );

    consoleSpy.mockRestore();
  });

  it('sends only the payment method with each browser analytics event', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const receive = vi.fn();
    vi.stubGlobal('window', { va: receive });
    const events = [
      'payment_method_selected',
      'payment_attempted',
      'payment_succeeded',
      'payment_failed',
    ] as const;

    for (const event of events) {
      trackPaymentEvent(event, {
        method: 'x402',
        tipId: 'private-tip',
        amountUsd: 1.5,
        error: 'wallet returned identifying transaction details',
        durationMs: 3200,
      });
      expect(receive).toHaveBeenLastCalledWith(
        'event',
        expect.objectContaining({
          name: event,
          data: { method: 'x402' },
        })
      );
    }
    expect(receive).toHaveBeenCalledTimes(events.length);
  });
});

describe('createPaymentTimer', () => {
  it('returns elapsed time', async () => {
    const timer = createPaymentTimer();

    await new Promise((r) => setTimeout(r, 50));

    const elapsed = timer.elapsed();
    expect(elapsed).toBeGreaterThanOrEqual(40);
    expect(elapsed).toBeLessThan(500);
  });

  it('returns increasing values on subsequent calls', async () => {
    const timer = createPaymentTimer();

    const t1 = timer.elapsed();
    await new Promise((r) => setTimeout(r, 20));
    const t2 = timer.elapsed();

    expect(t2).toBeGreaterThanOrEqual(t1);
  });
});
