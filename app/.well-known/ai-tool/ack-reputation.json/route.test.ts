import { describe, expect, it } from 'vitest';
import { GET } from './route';
import {
  ERC_8257_MANIFEST_TYPE,
  REPUTATION_TOOL_NAME,
} from '@/lib/tool-manifest';

describe('GET /.well-known/ai-tool/ack-reputation.json', () => {
  it('serves the ERC-8257 reputation manifest', async () => {
    const res = await GET();

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(res.headers.get('cache-control')).toBe('public, max-age=3600');

    const manifest = await res.json();
    expect(manifest.type).toBe(ERC_8257_MANIFEST_TYPE);
    expect(manifest.name).toBe(REPUTATION_TOOL_NAME);
    expect(manifest.endpoint).toMatch(/\/api\/tool$/);
    expect(manifest.inputs.required).toEqual(['action']);
    expect(manifest.pricing[0].protocol).toBe('x402');
    expect(manifest.pricing[0].amount).toBe('10000');
  });
});
