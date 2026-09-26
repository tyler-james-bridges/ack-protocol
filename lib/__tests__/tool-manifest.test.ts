import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  ERC_8257_MANIFEST_TYPE,
  REPUTATION_ACTIONS,
  REPUTATION_TOOL_NAME,
  buildAckReputationManifest,
  usdcToBaseUnits,
  x402UsdcPricing,
} from '../tool-manifest';

describe('tool-manifest', () => {
  const originalBase = process.env.NEXT_PUBLIC_BASE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://ack-onchain.dev';
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_BASE_URL = originalBase;
  });

  it('converts decimal USDC to 6-decimal base units', () => {
    expect(usdcToBaseUnits('0.01')).toBe('10000');
    expect(usdcToBaseUnits('0.02')).toBe('20000');
  });

  it('emits Base and Abstract x402 pricing at $0.01', () => {
    const pricing = x402UsdcPricing({
      amountUsdc: '0.01',
      recipient: '0x668aDd9213985E7Fd613Aec87767C892f4b9dF1c',
    });
    expect(pricing).toHaveLength(2);
    expect(pricing[0]).toMatchObject({
      amount: '10000',
      protocol: 'x402',
      asset: expect.stringContaining('eip155:8453/erc20:'),
      recipient: expect.stringMatching(/^eip155:8453:0x668add/),
    });
    expect(pricing[1]).toMatchObject({
      amount: '10000',
      protocol: 'x402',
      asset: expect.stringContaining('eip155:2741/erc20:'),
    });
  });

  it('builds an ERC-8257 reputation manifest', () => {
    const manifest = buildAckReputationManifest();
    expect(manifest.type).toBe(ERC_8257_MANIFEST_TYPE);
    expect(manifest.name).toBe(REPUTATION_TOOL_NAME);
    expect(manifest.endpoint).toBe('https://ack-onchain.dev/api/tool');
    expect(manifest.inputs.required).toEqual(['action']);
    expect(manifest.inputs.properties.action).toMatchObject({
      enum: [...REPUTATION_ACTIONS],
    });
    expect(manifest.pricing[0].amount).toBe('10000');
    expect(manifest.tags).toContain('erc-8257');
    expect(manifest.creatorAddress).toMatch(/^0x[0-9a-f]{40}$/);
  });
});
