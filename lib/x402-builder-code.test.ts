import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@x402/next', () => ({
  withX402: (handler: unknown) => handler,
  x402ResourceServer: class {
    register() {
      return this;
    }
    registerExtension() {
      return this;
    }
  },
}));

vi.mock('@x402/core/server', () => ({
  HTTPFacilitatorClient: class {},
}));

vi.mock('@x402/evm/exact/server', () => ({
  ExactEvmScheme: class {
    registerMoneyParser() {
      return this;
    }
  },
}));

vi.mock('@x402/extensions/builder-code', () => ({
  BUILDER_CODE: 'builder-code',
  builderCodeResourceServerExtension: { key: 'builder-code' },
  declareBuilderCodeExtension: (code: string) => ({ info: { a: code } }),
}));

describe('x402 builder-code facilitator gate', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.BASE_X402_BUILDER_CODE;
    delete process.env.BASE_X402_FACILITATOR_URL;
    delete process.env.X402_BASE_FACILITATOR_URL;
  });

  it('keeps openx402 as the Base facilitator and hides builder-code', async () => {
    const x402 = await import('./x402');
    expect(x402.BASE_FACILITATOR_URL).toBe(x402.OPENX402_BASE_FACILITATOR_URL);
    expect(x402.facilitatorSupportsBuilderCode()).toBe(false);
    expect(x402.paymentExtensionsForChain(8453)).toBeUndefined();
    expect(x402.paymentExtensionsForChain(2741)).toBeUndefined();
    expect(x402.CDP_X402_FACILITATOR_URL).toContain('api.cdp.coinbase.com');
  });

  it('advertises builder-code on Base when explicitly enabled', async () => {
    process.env.BASE_X402_BUILDER_CODE = '1';
    const x402 = await import('./x402');
    expect(x402.facilitatorSupportsBuilderCode()).toBe(true);
    expect(x402.paymentExtensionsForChain(8453)).toEqual({
      'builder-code': { info: { a: 'bc_jhxtiha3' } },
    });
    expect(x402.paymentExtensionsForChain(2741)).toBeUndefined();
  });
});
