import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ERC_8257_MANIFEST_TYPE, usdcToBaseUnits } from '@/lib/tool-manifest';
import {
  ASSEMBLY_ACTIONS,
  ASSEMBLY_TOOL_NAME,
  ASSEMBLY_TOOL_PRICE_USDC,
  buildAckAssemblyManifest,
} from './assembly-manifest';

describe('assembly-manifest', () => {
  const originalBase = process.env.NEXT_PUBLIC_BASE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://ack-onchain.dev';
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_BASE_URL = originalBase;
  });

  it('builds an ERC-8257 assembly manifest at $0.02 on Base and Abstract', () => {
    const manifest = buildAckAssemblyManifest();
    expect(manifest.type).toBe(ERC_8257_MANIFEST_TYPE);
    expect(manifest.name).toBe(ASSEMBLY_TOOL_NAME);
    expect(manifest.endpoint).toBe('https://ack-onchain.dev/api/tool/assembly');
    expect(manifest.inputs.required).toEqual(['action']);
    expect(manifest.inputs.properties.action).toMatchObject({
      enum: [...ASSEMBLY_ACTIONS],
    });
    expect(ASSEMBLY_TOOL_PRICE_USDC).toBe('0.02');
    expect(manifest.pricing).toHaveLength(2);
    expect(manifest.pricing[0].amount).toBe(usdcToBaseUnits('0.02'));
    expect(manifest.pricing[0].asset).toContain('eip155:8453/erc20:');
    expect(manifest.pricing[1].asset).toContain('eip155:2741/erc20:');
    expect(manifest.tags).toContain('governance');
    expect(manifest.creatorAddress).toMatch(/^0x[0-9a-f]{40}$/);
  });
});
