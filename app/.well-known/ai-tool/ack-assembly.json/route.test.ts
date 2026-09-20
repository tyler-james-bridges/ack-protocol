import { describe, expect, it } from 'vitest';
import { GET } from './route';
import {
  ASSEMBLY_ACTIONS,
  ASSEMBLY_TOOL_NAME,
  ASSEMBLY_TOOL_PRICE_USDC,
} from '@/lib/tools/assembly-manifest';
import { ERC_8257_MANIFEST_TYPE, usdcToBaseUnits } from '@/lib/tool-manifest';

describe('GET /.well-known/ai-tool/ack-assembly.json', () => {
  it('serves the ERC-8257 assembly manifest', async () => {
    const res = await GET();

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(res.headers.get('cache-control')).toBe('public, max-age=3600');

    const manifest = await res.json();
    expect(manifest.type).toBe(ERC_8257_MANIFEST_TYPE);
    expect(manifest.name).toBe(ASSEMBLY_TOOL_NAME);
    expect(manifest.endpoint).toMatch(/\/api\/tool\/assembly$/);
    expect(manifest.inputs.required).toEqual(['action']);
    expect(manifest.inputs.properties.action.enum).toEqual([
      ...ASSEMBLY_ACTIONS,
    ]);
    expect(manifest.pricing[0].protocol).toBe('x402');
    expect(manifest.pricing[0].amount).toBe(
      usdcToBaseUnits(ASSEMBLY_TOOL_PRICE_USDC)
    );
    expect(manifest.pricing).toHaveLength(2);
  });
});
