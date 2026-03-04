import { describe, it, expect } from 'vitest';
import { getChainConfig, getSupportedChains, CHAIN_CONFIGS } from '../chains';

describe('SDK chains', () => {
  describe('getChainConfig', () => {
    it('returns Abstract config', () => {
      const config = getChainConfig('abstract');
      expect(config.id).toBe(2741);
      expect(config.name).toBe('Abstract');
      expect(config.rpcUrl).toBeTruthy();
    });

    it('returns Base config', () => {
      const config = getChainConfig('base');
      expect(config.id).toBe(8453);
      expect(config.name).toBe('Base');
    });

    it('returns Ethereum config', () => {
      const config = getChainConfig('ethereum');
      expect(config.id).toBe(1);
    });

    it('throws for unsupported chain', () => {
      expect(() => getChainConfig('unknown' as never)).toThrow(
        'Unsupported chain'
      );
    });
  });

  describe('getSupportedChains', () => {
    it('returns all chain IDs', () => {
      const chains = getSupportedChains();
      expect(chains).toContain('abstract');
      expect(chains).toContain('base');
      expect(chains).toContain('ethereum');
      expect(chains).toContain('polygon');
    });

    it('matches CHAIN_CONFIGS keys', () => {
      const chains = getSupportedChains();
      expect(chains).toEqual(Object.keys(CHAIN_CONFIGS));
    });

    it('has at least 10 supported chains', () => {
      expect(getSupportedChains().length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('CHAIN_CONFIGS', () => {
    it('all configs have id, name, and rpcUrl', () => {
      for (const [key, config] of Object.entries(CHAIN_CONFIGS)) {
        expect(config.id, `${key} missing id`).toBeTypeOf('number');
        expect(config.name, `${key} missing name`).toBeTruthy();
        expect(config.rpcUrl, `${key} missing rpcUrl`).toMatch(/^https?:\/\//);
      }
    });

    it('all chain IDs are unique', () => {
      const ids = Object.values(CHAIN_CONFIGS).map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
