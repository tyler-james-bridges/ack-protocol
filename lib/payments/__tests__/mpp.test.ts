import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  mppEnabled,
  getMppConfig,
  buildMppChallenge,
  resetMppxServer,
  toRawUnits,
} from '../mpp';
import {
  mapMppError,
  mapMppErrorToUiMessage,
  type MppUserError,
} from '../mpp-errors';
import {
  isProofReplayed,
  markProofUsed,
  parseXPaymentProofId,
} from '../replay';

// --- mpp config ---

describe('mppEnabled', () => {
  const origEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...origEnv };
  });

  it('returns false when MPP_ENABLED is not set', () => {
    delete process.env.MPP_ENABLED;
    expect(mppEnabled()).toBe(false);
  });

  it('returns false when MPP_ENABLED is "false"', () => {
    process.env.MPP_ENABLED = 'false';
    expect(mppEnabled()).toBe(false);
  });

  it('returns true when MPP_ENABLED is "true"', () => {
    process.env.MPP_ENABLED = 'true';
    expect(mppEnabled()).toBe(true);
  });
});

describe('getMppConfig', () => {
  const origEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...origEnv };
  });

  it('throws when MPP_REALM is missing', () => {
    process.env.MPP_ENABLED = 'true';
    delete process.env.MPP_REALM;
    process.env.MPP_PAY_TO = '0xabc';
    expect(() => getMppConfig()).toThrow('MPP_ENABLED=true requires MPP_REALM');
  });

  it('throws when MPP_PAY_TO and AGENT_WALLET_ADDRESS are both missing', () => {
    process.env.MPP_ENABLED = 'true';
    process.env.MPP_REALM = 'ack-onchain.dev';
    delete process.env.MPP_PAY_TO;
    delete process.env.AGENT_WALLET_ADDRESS;
    expect(() => getMppConfig()).toThrow(
      'MPP_ENABLED=true requires MPP_PAY_TO'
    );
  });

  it('falls back to AGENT_WALLET_ADDRESS when MPP_PAY_TO is missing', () => {
    process.env.MPP_ENABLED = 'true';
    process.env.MPP_REALM = 'ack-onchain.dev';
    delete process.env.MPP_PAY_TO;
    process.env.AGENT_WALLET_ADDRESS = '0xfallback';
    const config = getMppConfig();
    expect(config.payTo).toBe('0xfallback');
  });

  it('returns full config when all env vars are set', () => {
    process.env.MPP_ENABLED = 'true';
    process.env.MPP_REALM = 'ack-onchain.dev';
    process.env.MPP_PAY_TO = '0xpayto';
    process.env.MPP_ASSET = 'USDC';
    const config = getMppConfig();
    expect(config).toEqual({
      realm: 'ack-onchain.dev',
      payTo: '0xpayto',
      asset: 'USDC',
    });
  });

  it('defaults asset to pathUSD when MPP_ASSET is not set', () => {
    process.env.MPP_ENABLED = 'true';
    process.env.MPP_REALM = 'ack-onchain.dev';
    process.env.MPP_PAY_TO = '0xpayto';
    delete process.env.MPP_ASSET;
    const config = getMppConfig();
    expect(config.asset).toBe('pathUSD');
  });
});

describe('buildMppChallenge', () => {
  it('builds challenge from provided config', () => {
    const challenge = buildMppChallenge({
      realm: 'test.dev',
      payTo: '0x123',
      asset: 'USDC',
    });
    expect(challenge).toEqual({
      realm: 'test.dev',
      payTo: '0x123',
      asset: 'USDC',
      instruction: 'Provide Authorization: Payment <credential>',
    });
  });
});

// --- toRawUnits ---

describe('toRawUnits', () => {
  it('converts "1.00" to 1000000', () => {
    expect(toRawUnits('1.00')).toBe('1000000');
  });

  it('converts "0.01" to 10000', () => {
    expect(toRawUnits('0.01')).toBe('10000');
  });

  it('converts "100" to 100000000', () => {
    expect(toRawUnits('100')).toBe('100000000');
  });

  it('converts "0.50" to 500000', () => {
    expect(toRawUnits('0.50')).toBe('500000');
  });

  it('handles extra decimal places by truncating', () => {
    expect(toRawUnits('1.123456789')).toBe('1123456');
  });
});

// --- mpp-errors ---

describe('mapMppError', () => {
  it('maps "account not found" to MPP_ACCOUNT_NOT_FOUND', () => {
    const err = mapMppError(new Error('account not found'));
    expect(err.code).toBe('MPP_ACCOUNT_NOT_FOUND');
    expect(err.recoverable).toBe(false);
  });

  it('maps "insufficient balance" to MPP_INSUFFICIENT_BALANCE', () => {
    const err = mapMppError('insufficient balance for transfer');
    expect(err.code).toBe('MPP_INSUFFICIENT_BALANCE');
    expect(err.recoverable).toBe(true);
  });

  it('maps "user rejected" to MPP_USER_REJECTED', () => {
    const err = mapMppError(new Error('user rejected the request'));
    expect(err.code).toBe('MPP_USER_REJECTED');
    expect(err.recoverable).toBe(true);
  });

  it('maps "timeout" to MPP_TIMEOUT', () => {
    const err = mapMppError('request timed out');
    expect(err.code).toBe('MPP_TIMEOUT');
    expect(err.recoverable).toBe(true);
  });

  it('maps "credential malformed" to MPP_CREDENTIAL_INVALID', () => {
    const err = mapMppError(new Error('credential malformed'));
    expect(err.code).toBe('MPP_CREDENTIAL_INVALID');
    expect(err.recoverable).toBe(true);
  });

  it('maps "expired" to MPP_EXPIRED', () => {
    const err = mapMppError('payment expired');
    expect(err.code).toBe('MPP_EXPIRED');
    expect(err.recoverable).toBe(true);
  });

  it('maps "unsupported method" to MPP_METHOD_UNSUPPORTED', () => {
    const err = mapMppError(new Error('unsupported method for this chain'));
    expect(err.code).toBe('MPP_METHOD_UNSUPPORTED');
    expect(err.recoverable).toBe(false);
  });

  it('maps "invalid asset" to MPP_INVALID_ASSET', () => {
    const err = mapMppError(new Error('invalid asset type'));
    expect(err.code).toBe('MPP_INVALID_ASSET');
    expect(err.recoverable).toBe(false);
  });

  it('maps "MPP_SECRET_KEY" config error', () => {
    const err = mapMppError(new Error('MPP_SECRET_KEY is required'));
    expect(err.code).toBe('MPP_CONFIG_ERROR');
    expect(err.recoverable).toBe(false);
  });

  it('maps "verification failed" to MPP_VERIFICATION_FAILED', () => {
    const err = mapMppError('verification failed for credential');
    expect(err.code).toBe('MPP_VERIFICATION_FAILED');
    expect(err.recoverable).toBe(true);
  });

  it('falls back to MPP_UNKNOWN_ERROR for unrecognized errors', () => {
    const err = mapMppError(new Error('something completely unexpected'));
    expect(err.code).toBe('MPP_UNKNOWN_ERROR');
    expect(err.recoverable).toBe(true);
  });

  it('handles non-Error, non-string input gracefully', () => {
    const err = mapMppError(42);
    expect(err.code).toBe('MPP_UNKNOWN_ERROR');
  });
});

// --- mapMppErrorToUiMessage ---

describe('mapMppErrorToUiMessage', () => {
  it('prefers problem+json detail field when present', () => {
    const apiError = {
      detail: 'Payment authorization has expired.',
      code: 'MPP_EXPIRED',
    };
    expect(mapMppErrorToUiMessage(apiError)).toBe(
      'Payment authorization has expired.'
    );
  });

  it('falls back to mapMppError for Error objects', () => {
    const msg = mapMppErrorToUiMessage(new Error('insufficient balance'));
    expect(msg).toContain('Insufficient balance');
  });

  it('falls back to mapMppError for plain strings', () => {
    const msg = mapMppErrorToUiMessage('user rejected');
    expect(msg).toBe('Payment was cancelled.');
  });

  it('returns generic message for unknown errors', () => {
    const msg = mapMppErrorToUiMessage(new Error('something wild'));
    expect(msg).toContain('MPP payment failed');
  });

  it('handles null/undefined gracefully', () => {
    const msg = mapMppErrorToUiMessage(null);
    expect(msg).toContain('MPP payment failed');
  });
});

// --- replay ---

describe('replay protection', () => {
  it('detects replayed proof ids', () => {
    const id = 'test-replay-' + Date.now();
    expect(isProofReplayed(id)).toBe(false);
    markProofUsed(id);
    expect(isProofReplayed(id)).toBe(true);
  });

  it('ignores empty proof ids', () => {
    markProofUsed('');
    expect(isProofReplayed('')).toBe(false);
  });

  it('does not double-add the same id', () => {
    const id = 'test-dedup-' + Date.now();
    markProofUsed(id);
    markProofUsed(id);
    expect(isProofReplayed(id)).toBe(true);
  });
});

describe('parseXPaymentProofId', () => {
  it('extracts hash from valid v1 proof', () => {
    const hash = '0x' + 'a'.repeat(64);
    const result = parseXPaymentProofId(`v1:1.50:${hash}`);
    expect(result).toBe(hash);
  });

  it('handles integer amount', () => {
    const hash = '0x' + 'b'.repeat(64);
    const result = parseXPaymentProofId(`v1:100:${hash}`);
    expect(result).toBe(hash);
  });

  it('returns null for null input', () => {
    expect(parseXPaymentProofId(null)).toBeNull();
  });

  it('returns null for malformed proof', () => {
    expect(parseXPaymentProofId('garbage')).toBeNull();
    expect(parseXPaymentProofId('v1:abc:0x123')).toBeNull();
    expect(parseXPaymentProofId('v2:1.00:0x' + 'a'.repeat(64))).toBeNull();
  });

  it('returns null for short hash', () => {
    expect(parseXPaymentProofId('v1:1.00:0xabc')).toBeNull();
  });
});
