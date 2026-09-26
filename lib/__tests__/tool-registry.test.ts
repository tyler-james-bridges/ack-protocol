import { describe, it, expect } from 'vitest';
import {
  getToolAction,
  listToolActionNames,
  registerToolAction,
} from '../tool-registry';

describe('tool-registry', () => {
  it('registers additional actions so later tools can extend the map', async () => {
    const name = `kudos_feed_${Date.now()}`;
    registerToolAction({
      name,
      tool: 'ack-kudos',
      description: 'later tool',
      handler: async () => ({ status: 200, body: { items: [] } }),
    });

    expect(listToolActionNames()).toContain(name);
    const result = await getToolAction(name)?.handler({});
    expect(result).toEqual({ status: 200, body: { items: [] } });
  });

  it('rejects the same action name from a different tool', () => {
    const name = `shared_${Date.now()}`;
    registerToolAction({
      name,
      tool: 'ack-reputation',
      description: 'profile',
      handler: async () => ({ status: 200, body: {} }),
    });
    expect(() =>
      registerToolAction({
        name,
        tool: 'ack-kudos',
        description: 'clash',
        handler: async () => ({ status: 200, body: {} }),
      })
    ).toThrow(/already registered/);
  });

  it('allows the owning tool to re-register the same action', () => {
    const name = `rerun_${Date.now()}`;
    registerToolAction({
      name,
      tool: 'ack-reputation',
      description: 'first',
      handler: async () => ({ status: 200, body: { n: 1 } }),
    });
    registerToolAction({
      name,
      tool: 'ack-reputation',
      description: 'second',
      handler: async () => ({ status: 200, body: { n: 2 } }),
    });
    expect(getToolAction(name)?.description).toBe('second');
  });
});
