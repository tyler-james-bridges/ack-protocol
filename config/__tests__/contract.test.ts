import { describe, it, expect } from 'vitest';
import {
  toCAIP10Address,
  KUDOS_CATEGORIES,
  CATEGORY_META,
  AGENT_REGISTRY_CAIP10,
  IDENTITY_REGISTRY_ADDRESS,
} from '../contract';

describe('toCAIP10Address', () => {
  it('formats address as CAIP-10', () => {
    const result = toCAIP10Address('0x1234567890abcdef');
    expect(result).toMatch(/^eip155:\d+:0x1234567890abcdef$/);
  });

  it('includes the correct chain ID', () => {
    const result = toCAIP10Address('0xABC');
    // Abstract chain ID is 2741
    expect(result).toContain('eip155:2741:');
  });
});

describe('AGENT_REGISTRY_CAIP10', () => {
  it('contains eip155 prefix, chain ID, and registry address', () => {
    expect(AGENT_REGISTRY_CAIP10).toContain('eip155:');
    expect(AGENT_REGISTRY_CAIP10).toContain(IDENTITY_REGISTRY_ADDRESS);
  });
});

describe('KUDOS_CATEGORIES', () => {
  it('has 6 categories', () => {
    expect(KUDOS_CATEGORIES).toHaveLength(6);
  });

  it('includes expected categories', () => {
    expect(KUDOS_CATEGORIES).toContain('reliability');
    expect(KUDOS_CATEGORIES).toContain('speed');
    expect(KUDOS_CATEGORIES).toContain('accuracy');
    expect(KUDOS_CATEGORIES).toContain('creativity');
    expect(KUDOS_CATEGORIES).toContain('collaboration');
    expect(KUDOS_CATEGORIES).toContain('security');
  });

  it('each category has metadata', () => {
    for (const cat of KUDOS_CATEGORIES) {
      expect(CATEGORY_META[cat]).toBeDefined();
      expect(CATEGORY_META[cat].label).toBeTruthy();
      expect(CATEGORY_META[cat].color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(CATEGORY_META[cat].description).toBeTruthy();
    }
  });
});
