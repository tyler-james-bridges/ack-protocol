import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildFeedback, parseFeedbackURI, ipfsToHttp } from '../utils';

describe('SDK utils', () => {
  describe('buildFeedback', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns a base64 data URI', () => {
      const result = buildFeedback({
        agentId: 1,
        clientAddress: '0xabc',
        category: 'reliability',
        message: 'Test',
      });
      expect(result.feedbackURI).toMatch(/^data:application\/json;base64,/);
    });

    it('returns a 0x-prefixed keccak256 hash', () => {
      const result = buildFeedback({
        agentId: 1,
        clientAddress: '0xabc',
        category: 'speed',
        message: 'Fast!',
      });
      expect(result.feedbackHash).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it('encodes agentId and category in the JSON', () => {
      const result = buildFeedback({
        agentId: 42,
        clientAddress: '0xabc',
        category: 'accuracy',
        message: 'Precise',
      });
      const base64 = result.feedbackURI.replace(
        'data:application/json;base64,',
        ''
      );
      const parsed = JSON.parse(Buffer.from(base64, 'base64').toString());
      expect(parsed.agentId).toBe(42);
      expect(parsed.tag2).toBe('accuracy');
      expect(parsed.reasoning).toBe('Precise');
    });

    it('uses default chainId 2741 (Abstract)', () => {
      const result = buildFeedback({
        agentId: 1,
        clientAddress: '0xabc',
        category: 'reliability',
        message: 'Test',
      });
      const base64 = result.feedbackURI.replace(
        'data:application/json;base64,',
        ''
      );
      const parsed = JSON.parse(Buffer.from(base64, 'base64').toString());
      expect(parsed.clientAddress).toContain('eip155:2741:');
    });

    it('uses custom chainId when provided', () => {
      const result = buildFeedback({
        agentId: 1,
        clientAddress: '0xabc',
        category: 'reliability',
        message: 'Test',
        chainId: 8453,
      });
      const base64 = result.feedbackURI.replace(
        'data:application/json;base64,',
        ''
      );
      const parsed = JSON.parse(Buffer.from(base64, 'base64').toString());
      expect(parsed.clientAddress).toContain('eip155:8453:');
    });

    it('trims message whitespace', () => {
      const result = buildFeedback({
        agentId: 1,
        clientAddress: '0xabc',
        category: 'reliability',
        message: '  spaced  ',
      });
      const base64 = result.feedbackURI.replace(
        'data:application/json;base64,',
        ''
      );
      const parsed = JSON.parse(Buffer.from(base64, 'base64').toString());
      expect(parsed.reasoning).toBe('spaced');
    });
  });

  describe('parseFeedbackURI', () => {
    it('parses base64 data URI', () => {
      const payload = { reasoning: 'Great!', agentId: 1 };
      const base64 = Buffer.from(JSON.stringify(payload)).toString('base64');
      const uri = `data:application/json;base64,${base64}`;

      const result = parseFeedbackURI(uri);
      expect(result).not.toBeNull();
      expect(result!.reasoning).toBe('Great!');
      expect(result!.agentId).toBe(1);
    });

    it('parses data:, URI with URL encoding', () => {
      const payload = { message: 'Hello world' };
      const uri = `data:,${encodeURIComponent(JSON.stringify(payload))}`;

      const result = parseFeedbackURI(uri);
      expect(result).not.toBeNull();
      expect(result!.message).toBe('Hello world');
    });

    it('returns null for unknown URI format', () => {
      expect(parseFeedbackURI('https://example.com/data')).toBeNull();
      expect(parseFeedbackURI('')).toBeNull();
      expect(parseFeedbackURI('random string')).toBeNull();
    });

    it('returns null for malformed base64', () => {
      const result = parseFeedbackURI(
        'data:application/json;base64,!!invalid!!'
      );
      expect(result).toBeNull();
    });

    it('returns null for malformed JSON in data:, URI', () => {
      const result = parseFeedbackURI('data:,not-json');
      expect(result).toBeNull();
    });

    it('roundtrips with buildFeedback', () => {
      const feedback = buildFeedback({
        agentId: 5,
        clientAddress: '0xdef',
        category: 'creativity',
        message: 'Very creative!',
      });

      const parsed = parseFeedbackURI(feedback.feedbackURI);
      expect(parsed).not.toBeNull();
      expect(parsed!.agentId).toBe(5);
      expect(parsed!.reasoning).toBe('Very creative!');
    });
  });

  describe('ipfsToHttp', () => {
    it('converts ipfs:// URI with default gateway', () => {
      expect(ipfsToHttp('ipfs://QmHash')).toBe('https://ipfs.io/ipfs/QmHash');
    });

    it('uses custom gateway', () => {
      expect(ipfsToHttp('ipfs://QmHash', 'https://custom.gateway')).toBe(
        'https://custom.gateway/ipfs/QmHash'
      );
    });

    it('passes through http URLs', () => {
      const url = 'https://example.com/image.png';
      expect(ipfsToHttp(url)).toBe(url);
    });

    it('passes through empty string', () => {
      expect(ipfsToHttp('')).toBe('');
    });

    it('handles IPFS URI with path', () => {
      expect(ipfsToHttp('ipfs://QmHash/path/to/file')).toBe(
        'https://ipfs.io/ipfs/QmHash/path/to/file'
      );
    });
  });
});
