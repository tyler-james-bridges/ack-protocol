import { describe, expect, it } from 'vitest';
import { paymentRefTxHash } from './payment-ref';

describe('paymentRefTxHash', () => {
  const hash =
    '0xd2f76f380901785842b4d8f9d539f7b8b84a2a0fa415bac2cec725947a2a10e1';

  it('returns a bare settlement hash', () => {
    expect(paymentRefTxHash(hash)).toBe(hash);
  });

  it('strips an x402 prefix', () => {
    expect(paymentRefTxHash(`x402:${hash}`)).toBe(hash);
  });

  it('ignores the facilitator placeholder', () => {
    expect(paymentRefTxHash('x402-facilitator-settlement')).toBeNull();
  });
});
