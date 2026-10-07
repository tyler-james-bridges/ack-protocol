import { describe, expect, it } from 'vitest';
import {
  facilitatorRejectionReason,
  settlementTransactionHash,
  x402RejectionMessage,
} from './x402-errors';

function headers(values: Record<string, string>): {
  get(name: string): string | null;
} {
  const lower = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key.toLowerCase(), value])
  );
  return {
    get(name: string) {
      return lower[name.toLowerCase()] ?? null;
    },
  };
}

function encoded(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64');
}

describe('x402RejectionMessage', () => {
  it('explains an unregistered payee', () => {
    expect(x402RejectionMessage('address_not_registered')).toBe(
      "This agent's owner is not registered with the payment facilitator, so the tip could not be settled."
    );
  });

  it('explains an unfunded payer', () => {
    expect(x402RejectionMessage('invalid_exact_evm_insufficient_balance')).toBe(
      'Your wallet does not have enough USDC for this tip.'
    );
    expect(x402RejectionMessage('insufficient_funds')).toBe(
      'Your wallet does not have enough USDC for this tip.'
    );
  });

  it('finds a reason code embedded in a longer facilitator message', () => {
    expect(
      x402RejectionMessage('Failed to verify payment: address_not_registered')
    ).toContain('not registered');
  });

  it('replaces an empty 402 with a readable fallback', () => {
    expect(x402RejectionMessage('Payment failed (402)')).toBe(
      'The payment facilitator rejected this tip. Try again.'
    );
  });

  it('leaves wallet errors intact', () => {
    expect(x402RejectionMessage('User rejected the request.')).toBe(
      'User rejected the request.'
    );
  });
});

describe('facilitatorRejectionReason', () => {
  it('reads the verify reason from PAYMENT-REQUIRED', () => {
    const reason = facilitatorRejectionReason(
      headers({
        'PAYMENT-REQUIRED': encoded({
          x402Version: 2,
          error: 'address_not_registered',
        }),
      })
    );
    expect(reason).toBe('address_not_registered');
  });

  it('ignores the unpaid challenge', () => {
    const reason = facilitatorRejectionReason(
      headers({
        'PAYMENT-REQUIRED': encoded({ error: 'Payment required' }),
      })
    );
    expect(reason).toBeNull();
  });

  it('reads a successful settlement tx hash', () => {
    const hash =
      '0xd2f76f380901785842b4d8f9d539f7b8b84a2a0fa415bac2cec725947a2a10e1';
    expect(
      settlementTransactionHash(
        headers({
          'PAYMENT-RESPONSE': encoded({
            success: true,
            transaction: hash,
            network: 'eip155:8453',
          }),
        })
      )
    ).toBe(hash);
  });

  it('ignores a failed settlement response', () => {
    expect(
      settlementTransactionHash(
        headers({
          'PAYMENT-RESPONSE': encoded({
            success: false,
            errorReason: 'insufficient_funds',
            transaction: '',
            network: 'eip155:8453',
          }),
        })
      )
    ).toBeNull();
  });

  it('reads a settle failure from PAYMENT-RESPONSE', () => {
    const reason = facilitatorRejectionReason(
      headers({
        'PAYMENT-RESPONSE': encoded({
          success: false,
          errorReason: 'insufficient_funds',
          transaction: '',
          network: 'eip155:8453',
        }),
      })
    );
    expect(reason).toBe('insufficient_funds');
  });
});
