import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PAYMENT_METHODS,
  fetchPaymentMethods,
  type PaymentMethodsResponse,
} from './discovery';

describe('PAYMENT_METHODS', () => {
  it('defines x402, mpp, and direct methods', () => {
    expect(PAYMENT_METHODS.x402).toBeDefined();
    expect(PAYMENT_METHODS.mpp).toBeDefined();
    expect(PAYMENT_METHODS.direct).toBeDefined();
  });

  it('x402 has correct structure', () => {
    const m = PAYMENT_METHODS.x402;
    expect(m.id).toBe('x402');
    expect(m.name).toBe('x402 Protocol');
    expect(m.badge).toBe('Recommended');
    expect(m.requirements).toContain('Wallet connected');
    expect(m.description).toContain('x402');
  });

  it('mpp has correct structure', () => {
    const m = PAYMENT_METHODS.mpp;
    expect(m.id).toBe('mpp');
    expect(m.name).toBe('MPP (Micropayment Protocol)');
    expect(m.badge).toBe('New');
    expect(m.requirements).toContain('MPP-compatible wallet or agent');
  });

  it('direct has correct structure', () => {
    const m = PAYMENT_METHODS.direct;
    expect(m.id).toBe('direct');
    expect(m.name).toBe('Direct Transfer');
    expect(m.badge).toBe('Fallback');
  });
});

describe('fetchPaymentMethods', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns fallback methods when fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500 })
    );

    const result = await fetchPaymentMethods();

    expect(result.defaultMethod).toBe('x402');
    expect(result.methods).toHaveLength(2);
    expect(result.methods[0].id).toBe('x402');
    expect(result.methods[0].enabled).toBe(true);
    expect(result.methods[1].id).toBe('direct');
    expect(result.methods[1].enabled).toBe(true);
  });

  it('returns server response when fetch succeeds', async () => {
    const mockResponse: PaymentMethodsResponse = {
      methods: [
        { ...PAYMENT_METHODS.x402, enabled: true },
        { ...PAYMENT_METHODS.mpp, enabled: true },
        { ...PAYMENT_METHODS.direct, enabled: true },
      ],
      defaultMethod: 'x402',
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })
    );

    const result = await fetchPaymentMethods();

    expect(result.methods).toHaveLength(3);
    expect(result.methods.map((m) => m.id)).toEqual(['x402', 'mpp', 'direct']);
    expect(result.defaultMethod).toBe('x402');
  });
});
