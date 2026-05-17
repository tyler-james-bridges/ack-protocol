import { describe, it, expect } from 'vitest';
import {
  TOKEN_MAP,
  ABOREAN_ROUTER,
  MORPHO,
  MYRIAD_PM,
  WETH,
  USDC_E,
  KONA,
  AGW_ADDRESS,
} from '../constants';

// Import validation functions directly to avoid pulling in AGW client
// via the swap/lend/markets modules that import client.ts
// The validation functions are pure logic with no side effects.

describe('defi constants', () => {
  it('has valid token addresses', () => {
    expect(WETH).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(USDC_E).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(KONA).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it('has valid contract addresses', () => {
    expect(ABOREAN_ROUTER).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(MORPHO).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(MYRIAD_PM).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(AGW_ADDRESS).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it('TOKEN_MAP contains expected tokens', () => {
    expect(TOKEN_MAP['ETH']).toBeDefined();
    expect(TOKEN_MAP['WETH']).toBeDefined();
    expect(TOKEN_MAP['USDC']).toBeDefined();
    expect(TOKEN_MAP['KONA']).toBeDefined();
    expect(TOKEN_MAP['ETH'].decimals).toBe(18);
    expect(TOKEN_MAP['USDC'].decimals).toBe(6);
  });

  it('ETH and WETH share the same address', () => {
    expect(TOKEN_MAP['ETH'].address).toBe(TOKEN_MAP['WETH'].address);
  });

  it('USDC and USDC.e share the same address', () => {
    expect(TOKEN_MAP['USDC'].address).toBe(TOKEN_MAP['USDC.e'].address);
  });
});

describe('swap param validation', () => {
  // Inline validation logic to avoid AGW client import chain
  function validateSwapParams(params: {
    from: string;
    to: string;
    amount: string;
    slippagePct?: number;
  }): string | null {
    const fromKey = params.from.toUpperCase();
    const toKey = params.to.toUpperCase();
    if (!TOKEN_MAP[fromKey]) return `Unknown token: ${params.from}`;
    if (!TOKEN_MAP[toKey]) return `Unknown token: ${params.to}`;
    if (fromKey === toKey) return 'Cannot swap token to itself';
    const amount = parseFloat(params.amount);
    if (isNaN(amount) || amount <= 0) return 'Amount must be a positive number';
    if (params.slippagePct !== undefined) {
      if (params.slippagePct < 0.1 || params.slippagePct > 50)
        return 'Slippage must be between 0.1% and 50%';
    }
    return null;
  }

  it('accepts valid params', () => {
    expect(
      validateSwapParams({ from: 'ETH', to: 'USDC', amount: '0.01' })
    ).toBeNull();
  });

  it('accepts valid params with slippage', () => {
    expect(
      validateSwapParams({
        from: 'USDC',
        to: 'ETH',
        amount: '10',
        slippagePct: 3,
      })
    ).toBeNull();
  });

  it('rejects unknown from token', () => {
    expect(
      validateSwapParams({ from: 'DOGE', to: 'USDC', amount: '1' })
    ).toContain('Unknown token');
  });

  it('rejects unknown to token', () => {
    expect(
      validateSwapParams({ from: 'ETH', to: 'SHIB', amount: '1' })
    ).toContain('Unknown token');
  });

  it('rejects same token swap', () => {
    expect(
      validateSwapParams({ from: 'ETH', to: 'ETH', amount: '1' })
    ).toContain('Cannot swap token to itself');
  });

  it('rejects zero amount', () => {
    expect(
      validateSwapParams({ from: 'ETH', to: 'USDC', amount: '0' })
    ).toContain('positive number');
  });

  it('rejects negative amount', () => {
    expect(
      validateSwapParams({ from: 'ETH', to: 'USDC', amount: '-1' })
    ).toContain('positive number');
  });

  it('rejects non-numeric amount', () => {
    expect(
      validateSwapParams({ from: 'ETH', to: 'USDC', amount: 'abc' })
    ).toContain('positive number');
  });

  it('rejects slippage too low', () => {
    expect(
      validateSwapParams({
        from: 'ETH',
        to: 'USDC',
        amount: '1',
        slippagePct: 0.01,
      })
    ).toContain('Slippage');
  });

  it('rejects slippage too high', () => {
    expect(
      validateSwapParams({
        from: 'ETH',
        to: 'USDC',
        amount: '1',
        slippagePct: 51,
      })
    ).toContain('Slippage');
  });
});

describe('lend param validation', () => {
  const VALID_ACTIONS = ['supply', 'borrow', 'repay', 'withdraw'];

  function validateLendParams(params: {
    action: string;
    amount: string;
  }): string | null {
    if (!VALID_ACTIONS.includes(params.action))
      return `Invalid action: ${params.action}. Must be one of: ${VALID_ACTIONS.join(', ')}`;
    const amount = parseFloat(params.amount);
    if (isNaN(amount) || amount <= 0) return 'Amount must be a positive number';
    return null;
  }

  it('accepts valid supply', () => {
    expect(validateLendParams({ action: 'supply', amount: '0.01' })).toBeNull();
  });

  it('accepts valid borrow', () => {
    expect(validateLendParams({ action: 'borrow', amount: '10' })).toBeNull();
  });

  it('accepts valid repay', () => {
    expect(validateLendParams({ action: 'repay', amount: '5' })).toBeNull();
  });

  it('accepts valid withdraw', () => {
    expect(
      validateLendParams({ action: 'withdraw', amount: '0.003' })
    ).toBeNull();
  });

  it('rejects invalid action', () => {
    expect(validateLendParams({ action: 'stake', amount: '1' })).toContain(
      'Invalid action'
    );
  });

  it('rejects zero amount', () => {
    expect(validateLendParams({ action: 'supply', amount: '0' })).toContain(
      'positive number'
    );
  });

  it('rejects non-numeric amount', () => {
    expect(validateLendParams({ action: 'supply', amount: 'xyz' })).toContain(
      'positive number'
    );
  });
});

describe('bet param validation', () => {
  function validateBetParams(params: {
    marketId: string;
    outcomeIndex: number;
    amount: string;
  }): string | null {
    const marketId = parseInt(params.marketId, 10);
    if (isNaN(marketId) || marketId < 0)
      return 'marketId must be a non-negative integer';
    if (params.outcomeIndex < 0 || params.outcomeIndex > 10)
      return 'outcomeIndex must be between 0 and 10';
    const amount = parseFloat(params.amount);
    if (isNaN(amount) || amount <= 0) return 'amount must be a positive number';
    return null;
  }

  it('accepts valid params', () => {
    expect(
      validateBetParams({ marketId: '164', outcomeIndex: 0, amount: '1' })
    ).toBeNull();
  });

  it('rejects negative marketId', () => {
    expect(
      validateBetParams({ marketId: '-1', outcomeIndex: 0, amount: '1' })
    ).toContain('marketId');
  });

  it('rejects non-numeric marketId', () => {
    expect(
      validateBetParams({ marketId: 'abc', outcomeIndex: 0, amount: '1' })
    ).toContain('marketId');
  });

  it('rejects negative outcomeIndex', () => {
    expect(
      validateBetParams({ marketId: '164', outcomeIndex: -1, amount: '1' })
    ).toContain('outcomeIndex');
  });

  it('rejects zero amount', () => {
    expect(
      validateBetParams({ marketId: '164', outcomeIndex: 0, amount: '0' })
    ).toContain('positive number');
  });

  it('rejects negative amount', () => {
    expect(
      validateBetParams({ marketId: '164', outcomeIndex: 0, amount: '-5' })
    ).toContain('positive number');
  });
});
