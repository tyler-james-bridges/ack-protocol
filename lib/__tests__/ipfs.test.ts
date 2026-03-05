import { describe, it, expect } from 'vitest';
import { ipfsToHttp } from '../ipfs';

describe('ipfsToHttp', () => {
  it('converts ipfs:// URI to gateway URL', () => {
    expect(ipfsToHttp('ipfs://QmHash123')).toBe(
      'https://dweb.link/ipfs/QmHash123'
    );
  });

  it('handles ipfs:// with subdirectory paths', () => {
    expect(ipfsToHttp('ipfs://QmHash123/metadata.json')).toBe(
      'https://dweb.link/ipfs/QmHash123/metadata.json'
    );
  });

  it('passes through http:// URLs unchanged', () => {
    const url = 'http://example.com/data.json';
    expect(ipfsToHttp(url)).toBe(url);
  });

  it('passes through https:// URLs unchanged', () => {
    const url = 'https://example.com/data.json';
    expect(ipfsToHttp(url)).toBe(url);
  });

  it('passes through empty string', () => {
    expect(ipfsToHttp('')).toBe('');
  });

  it('passes through non-IPFS URIs', () => {
    expect(ipfsToHttp('data:application/json;base64,abc')).toBe(
      'data:application/json;base64,abc'
    );
  });
});
