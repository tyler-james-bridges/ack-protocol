import { describe, it, expect } from 'vitest';
import {
  AGENT_REGISTRY_CAIP10,
  toCAIP10Address,
  KUDOS_CATEGORIES,
  CATEGORY_META,
  KUDOS_VALUE,
  KUDOS_VALUE_DECIMALS,
  KUDOS_TAG1,
  DEPLOYMENT_BLOCKS,
  EVENT_TOPICS,
} from '../constants';

describe('SDK constants', () => {
  describe('AGENT_REGISTRY_CAIP10', () => {
    it('returns eip155:{chainId}:{address} format', () => {
      const result = AGENT_REGISTRY_CAIP10(2741);
      expect(result).toMatch(/^eip155:2741:0x/);
    });

    it('works with different chain IDs', () => {
      expect(AGENT_REGISTRY_CAIP10(1)).toContain('eip155:1:');
      expect(AGENT_REGISTRY_CAIP10(8453)).toContain('eip155:8453:');
    });
  });

  describe('toCAIP10Address', () => {
    it('formats with default chain ID (2741)', () => {
      expect(toCAIP10Address('0xABC')).toBe('eip155:2741:0xABC');
    });

    it('formats with custom chain ID', () => {
      expect(toCAIP10Address('0xABC', 8453)).toBe('eip155:8453:0xABC');
    });
  });

  describe('KUDOS_CATEGORIES', () => {
    it('has 6 categories', () => {
      expect(KUDOS_CATEGORIES).toHaveLength(6);
    });

    it('includes all expected categories', () => {
      const expected = [
        'reliability',
        'speed',
        'accuracy',
        'creativity',
        'collaboration',
        'security',
      ];
      for (const cat of expected) {
        expect(KUDOS_CATEGORIES).toContain(cat);
      }
    });
  });

  describe('CATEGORY_META', () => {
    it('has entry for each category', () => {
      for (const cat of KUDOS_CATEGORIES) {
        const meta = CATEGORY_META[cat];
        expect(meta).toBeDefined();
        expect(meta.label).toBeTruthy();
        expect(meta.color).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(meta.description).toBeTruthy();
      }
    });
  });

  describe('kudos defaults', () => {
    it('KUDOS_VALUE is 5', () => {
      expect(KUDOS_VALUE).toBe(5);
    });

    it('KUDOS_VALUE_DECIMALS is 0', () => {
      expect(KUDOS_VALUE_DECIMALS).toBe(0);
    });

    it('KUDOS_TAG1 is "kudos"', () => {
      expect(KUDOS_TAG1).toBe('kudos');
    });
  });

  describe('DEPLOYMENT_BLOCKS', () => {
    it('has entry for Abstract (2741)', () => {
      expect(DEPLOYMENT_BLOCKS[2741]).toBeDefined();
      expect(typeof DEPLOYMENT_BLOCKS[2741]).toBe('bigint');
    });

    it('has entry for Ethereum (1)', () => {
      expect(DEPLOYMENT_BLOCKS[1]).toBeDefined();
    });

    it('all values are bigint', () => {
      for (const [, block] of Object.entries(DEPLOYMENT_BLOCKS)) {
        expect(typeof block).toBe('bigint');
      }
    });
  });

  describe('EVENT_TOPICS', () => {
    it('NEW_FEEDBACK is a 0x-prefixed hex string', () => {
      expect(EVENT_TOPICS.NEW_FEEDBACK).toMatch(/^0x[0-9a-f]{64}$/);
    });
  });
});
