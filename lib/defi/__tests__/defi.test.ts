import { describe, it, expect } from 'vitest';
import { validateLendParams } from '../lend';
import { validateBetParams } from '../markets';
import { validateSwapParams } from '../swap';
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

  for (const [from, source] of Object.entries(TOKEN_MAP)) {
    for (const [to, destination] of Object.entries(TOKEN_MAP)) {
      it(`resolves the router pair for ${from} to ${to}`, () => {
        const error = validateSwapParams({ from, to, amount: '1' });
        if (source.address === destination.address) {
          expect(error).toBe('Cannot swap token to itself');
        } else {
          expect(error).toBeNull();
        }
      });
    }
  }

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
