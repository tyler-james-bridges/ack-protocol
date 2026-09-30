import { describe, expect, it } from 'vitest';
import { publicClientForRegistry, registryFromMessage } from '../siwa-client';

const REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';

describe('siwa client chain', () => {
  it('builds a Base client from the registry chain id', () => {
    const client = publicClientForRegistry(`eip155:8453:${REGISTRY}`);
    expect(client?.chain?.id).toBe(8453);
  });

  it('builds an Abstract client from the registry chain id', () => {
    const client = publicClientForRegistry(`eip155:2741:${REGISTRY}`);
    expect(client?.chain?.id).toBe(2741);
  });

  it('rejects a registry on an unsupported chain', () => {
    expect(publicClientForRegistry(`eip155:10:${REGISTRY}`)).toBeNull();
    expect(publicClientForRegistry('not-a-registry')).toBeNull();
  });

  it('reads the registry line from a SIWA message', () => {
    const message = [
      'ack-onchain.dev wants you to sign in with your Agent account:',
      '0xabc',
      '',
      `Agent Registry: eip155:8453:${REGISTRY}`,
      'Agent ID: 1',
    ].join('\n');
    expect(registryFromMessage(message)).toBe(`eip155:8453:${REGISTRY}`);
    expect(registryFromMessage('no registry here')).toBeNull();
  });
});
