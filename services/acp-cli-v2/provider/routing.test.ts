import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routeOffering } from './routing';

test("routes by 'query' field to agent_discovery", () => {
  assert.equal(routeOffering({ query: 'trading' }), 'agent_discovery');
  assert.equal(routeOffering({ query: 'x', limit: 5 }), 'agent_discovery');
});

test("routes by 'agent' field to reputation_check", () => {
  assert.equal(routeOffering({ agent: '606' }), 'reputation_check');
  assert.equal(
    routeOffering({ agent: '2741:606', chain: 'abstract' }),
    'reputation_check'
  );
});

test("routes numeric 'agentId' to give_kudos", () => {
  assert.equal(routeOffering({ agentId: 606 }), 'give_kudos');
  assert.equal(
    routeOffering({ agentId: 606, category: 'speed' }),
    'give_kudos'
  );
});

test('returns null for unknown shapes', () => {
  assert.equal(routeOffering({}), null);
  assert.equal(routeOffering({ random: 'value' }), null);
  assert.equal(routeOffering(null), null);
  assert.equal(routeOffering('string'), null);
});

test('string agentId does not route to give_kudos (needs number)', () => {
  assert.equal(routeOffering({ agentId: '606' }), null);
});
