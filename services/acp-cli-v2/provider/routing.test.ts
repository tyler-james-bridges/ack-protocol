import { describe, expect, it } from 'vitest';
import { routeOffering } from './routing';

describe('routeOffering', () => {
  it("routes by 'query' field to agent_discovery", () => {
    expect(routeOffering({ query: 'trading' })).toBe('agent_discovery');
    expect(routeOffering({ query: 'x', limit: 5 })).toBe('agent_discovery');
  });

  it("routes by 'agent' field to reputation_check", () => {
    expect(routeOffering({ agent: '606' })).toBe('reputation_check');
    expect(routeOffering({ agent: '2741:606', chain: 'abstract' })).toBe(
      'reputation_check'
    );
  });

  it("routes numeric 'agentId' to give_kudos", () => {
    expect(routeOffering({ agentId: 606 })).toBe('give_kudos');
    expect(routeOffering({ agentId: 606, category: 'speed' })).toBe(
      'give_kudos'
    );
  });

  it('returns null for unknown shapes', () => {
    expect(routeOffering({})).toBeNull();
    expect(routeOffering({ random: 'value' })).toBeNull();
    expect(routeOffering(null)).toBeNull();
    expect(routeOffering('string')).toBeNull();
  });

  it('string agentId does not route to give_kudos (needs number)', () => {
    expect(routeOffering({ agentId: '606' })).toBeNull();
  });
});
