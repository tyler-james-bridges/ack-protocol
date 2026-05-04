import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildFeedback, type FeedbackFileParams } from '../feedback';

describe('buildFeedback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const baseParams: FeedbackFileParams = {
    agentId: 42,
    clientAddress: '0x1234567890abcdef',
    category: 'reliability',
    message: 'Excellent agent!',
  };

  it('returns a base64 data URI', () => {
    const result = buildFeedback(baseParams);
    expect(result.feedbackURI).toMatch(/^data:application\/json;base64,/);
  });

  it('returns a keccak256 hash starting with 0x', () => {
    const result = buildFeedback(baseParams);
    expect(result.feedbackHash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('returns valid JSON string', () => {
    const result = buildFeedback(baseParams);
    const parsed = JSON.parse(result.jsonStr);
    expect(parsed.agentId).toBe(42);
    expect(parsed.reasoning).toBe('Excellent agent!');
    expect(parsed.tag2).toBe('reliability');
    expect(parsed.agentRegistry).toContain('eip155:2741:');
    expect(parsed.clientAddress).toContain('eip155:2741:');
  });

  it('uses requested chain ID in CAIP-10 fields', () => {
    const result = buildFeedback({ ...baseParams, chainId: 8453 });
    const parsed = JSON.parse(result.jsonStr);
    expect(parsed.agentRegistry).toContain('eip155:8453:');
    expect(parsed.clientAddress).toContain('eip155:8453:');
  });

  it('decodes base64 URI back to original JSON', () => {
    const result = buildFeedback(baseParams);
    const base64 = result.feedbackURI.replace(
      'data:application/json;base64,',
      ''
    );
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');
    expect(decoded).toBe(result.jsonStr);
  });

  it('returns empty feedbackURI for bare kudos (no message, no category)', () => {
    const result = buildFeedback({
      ...baseParams,
      message: '',
      category: '' as never,
    });
    expect(result.feedbackURI).toBe('');
    expect(result.feedbackHash).toBe(
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    );
  });

  it('trims whitespace from message', () => {
    const result = buildFeedback({
      ...baseParams,
      message: '  hello world  ',
    });
    const parsed = JSON.parse(result.jsonStr);
    expect(parsed.reasoning).toBe('hello world');
  });

  it('includes fromAgentId when provided', () => {
    const result = buildFeedback({
      ...baseParams,
      fromAgentId: 7,
    });
    const parsed = JSON.parse(result.jsonStr);
    expect(parsed.fromAgentId).toBe(7);
  });

  it('omits fromAgentId when not provided', () => {
    const result = buildFeedback(baseParams);
    const parsed = JSON.parse(result.jsonStr);
    expect(parsed.fromAgentId).toBeUndefined();
  });

  it('uses default KUDOS_VALUE and KUDOS_VALUE_DECIMALS', () => {
    const result = buildFeedback(baseParams);
    const parsed = JSON.parse(result.jsonStr);
    expect(parsed.value).toBe('5');
    expect(parsed.valueDecimals).toBe(0);
  });

  it('uses custom value when provided', () => {
    const result = buildFeedback({
      ...baseParams,
      value: 3,
      valueDecimals: 1,
    });
    const parsed = JSON.parse(result.jsonStr);
    expect(parsed.value).toBe('3');
    expect(parsed.valueDecimals).toBe(1);
  });
});
