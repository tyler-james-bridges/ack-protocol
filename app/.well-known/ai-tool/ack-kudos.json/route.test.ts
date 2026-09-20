import { describe, it, expect } from 'vitest';
import { GET } from './route';
import { ackKudosManifest } from '@/lib/tools/kudos-manifest';

describe('GET /.well-known/ai-tool/ack-kudos.json', () => {
  it('serves the ERC-8257 kudos manifest', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');

    const body = await res.json();
    expect(body).toEqual(ackKudosManifest);
    expect(body.name).toBe('ack-kudos');
    expect(body.endpoint).toBe('https://ack-onchain.dev/api/tool/kudos');
    expect(body.pricing[0].amount).toBe('10000');
  });
});
