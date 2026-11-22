import { expect, it } from 'vitest';
import { GET } from '@/app/.well-known/agent-registration.json/route';

it('publishes the onchain category as one value in both discovery fields', async () => {
  const response = GET();
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.category).toBe(
    'infrastructure,reputation,interoperability,developer-tools'
  );
  expect(body.categories).toEqual([body.category]);
});

it('publishes the Solana registry account on its mainnet chain', async () => {
  const { registrations } = await GET().json();
  expect(registrations).toContainEqual(
    expect.objectContaining({
      asset: 'fx6DUWG1cfvvwaDgWhfQHydsbdYVbgg1aJuYDskmTv9',
      agentRegistry:
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ',
    })
  );
});

it('identifies every registered agent, including registrations with ID zero', async () => {
  const { registrations } = await GET().json();
  for (const { agentId } of registrations) {
    expect(Number.isSafeInteger(agentId)).toBe(true);
    expect(agentId).toBeGreaterThanOrEqual(0);
  }
  expect(registrations).toContainEqual(
    expect.objectContaining({ agentId: 0, asset: expect.any(String) })
  );
});
