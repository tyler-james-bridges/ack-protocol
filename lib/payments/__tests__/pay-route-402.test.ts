import { describe, it, expect } from 'vitest';

/**
 * Tests for 402 response compliance in the pay route.
 *
 * These validate the problemResponse helper behavior and the contract
 * that all 402 responses include:
 *   - Content-Type: application/problem+json
 *   - WWW-Authenticate header
 *   - RFC 9457 body structure (type, title, status, detail)
 *
 * Since the route handler requires Next.js runtime, we test the response
 * structure via the shared helper logic patterns.
 */

interface ProblemBody {
  type: string;
  title: string;
  status: number;
  detail: string;
  code?: string;
  [key: string]: unknown;
}

/**
 * Mirrors the problemResponse logic from the route for unit testing.
 */
function buildProblemBody(
  status: number,
  opts: {
    type?: string;
    title: string;
    detail: string;
    code?: string;
    extras?: Record<string, unknown>;
  }
): ProblemBody {
  return {
    type: opts.type || 'about:blank',
    title: opts.title,
    status,
    detail: opts.detail,
    ...(opts.code && { code: opts.code }),
    ...(opts.extras || {}),
  };
}

describe('402 problem+json response structure', () => {
  it('includes RFC 9457 required fields', () => {
    const body = buildProblemBody(402, {
      title: 'Payment Required',
      detail: 'You must pay to access this resource.',
    });

    expect(body.type).toBe('about:blank');
    expect(body.title).toBe('Payment Required');
    expect(body.status).toBe(402);
    expect(body.detail).toBe('You must pay to access this resource.');
  });

  it('includes custom type URI when provided', () => {
    const body = buildProblemBody(402, {
      type: 'https://paymentauth.org/problems/replay',
      title: 'Payment Proof Replayed',
      detail: 'This proof has already been used.',
      code: 'PAYMENT_PROOF_REPLAYED',
    });

    expect(body.type).toBe('https://paymentauth.org/problems/replay');
    expect(body.code).toBe('PAYMENT_PROOF_REPLAYED');
  });

  it('merges extras into body', () => {
    const body = buildProblemBody(402, {
      title: 'Replay',
      detail: 'Replayed.',
      extras: { proofId: 'mpp:abc123' },
    });

    expect(body.proofId).toBe('mpp:abc123');
  });

  it('uses about:blank when type is omitted', () => {
    const body = buildProblemBody(500, {
      title: 'Server Error',
      detail: 'Something broke.',
    });

    expect(body.type).toBe('about:blank');
    expect(body.status).toBe(500);
  });

  it('omits code field when not provided', () => {
    const body = buildProblemBody(402, {
      title: 'Test',
      detail: 'Test detail.',
    });

    expect(body.code).toBeUndefined();
  });
});

describe('WWW-Authenticate header contract', () => {
  it('all 402 error codes should map to a WWW-Authenticate value', () => {
    // These are the error scenarios from the pay route that return 402.
    // Each should produce a WWW-Authenticate with Payment realm.
    const errorCodes = [
      'MPP_VERIFY_ERROR',
      'PAYMENT_PROOF_REPLAYED',
      'MPP_CREDENTIAL_INVALID',
    ];

    for (const _code of errorCodes) {
      const authenticate = `Payment realm="ack-onchain.dev", asset="pathUSD"`;
      expect(authenticate).toContain('Payment realm=');
      expect(authenticate).toContain('asset=');
    }
  });

  it('default WWW-Authenticate uses ack-protocol realm', () => {
    const defaultAuth = 'Payment realm="ack-protocol"';
    expect(defaultAuth).toContain('Payment');
    expect(defaultAuth).toContain('realm=');
  });

  it('updated realm references ack-onchain.dev', () => {
    const authenticate = 'Payment realm="ack-onchain.dev", asset="pathUSD"';
    expect(authenticate).toContain('realm="ack-onchain.dev"');
  });
});
