import { describe, it, expect } from 'vitest';
import {
  ACK_KUDOS_METADATA_URI,
  ACK_KUDOS_PRICE_ATOMIC,
  ACK_KUDOS_PRICE_USDC,
  ACK_KUDOS_TOOL_ENDPOINT,
  ACK_KUDOS_TOOL_NAME,
  KUDOS_TOOL_ACTIONS,
  ackKudosManifest,
} from './kudos-manifest';
import { ACK_TREASURY_ADDRESS, USDC_ADDRESS } from '@/config/tokens';

describe('ackKudosManifest', () => {
  it('uses the ERC-8257 v1 type and origin-bound well-known path', () => {
    expect(ackKudosManifest.type).toBe(
      'https://ercs.ethereum.org/ERCS/erc-8257#tool-manifest-v1'
    );
    expect(ackKudosManifest.name).toBe(ACK_KUDOS_TOOL_NAME);
    expect(ackKudosManifest.endpoint).toBe(ACK_KUDOS_TOOL_ENDPOINT);
    expect(ACK_KUDOS_METADATA_URI).toBe(
      'https://ack-onchain.dev/.well-known/ai-tool/ack-kudos.json'
    );
  });

  it('keeps name and description within ERC-8257 limits', () => {
    expect(ackKudosManifest.name.length).toBeGreaterThan(0);
    expect(ackKudosManifest.name.length).toBeLessThanOrEqual(128);
    expect(ackKudosManifest.description.length).toBeGreaterThan(0);
    expect(ackKudosManifest.description.length).toBeLessThanOrEqual(500);
  });

  it('declares the six kudos tool actions', () => {
    expect(ackKudosManifest.inputs.required).toEqual(['action']);
    expect(ackKudosManifest.inputs.properties.action.enum).toEqual([
      ...KUDOS_TOOL_ACTIONS,
    ]);
    expect(KUDOS_TOOL_ACTIONS).toEqual([
      'kudos_feed',
      'kudos_detail',
      'tip_feed',
      'tip_stats',
      'streaks',
      'vouch',
    ]);
  });

  it('prices each call at $0.01 USDC on Abstract via x402', () => {
    expect(ACK_KUDOS_PRICE_USDC).toBe('0.01');
    expect(ackKudosManifest.pricing).toHaveLength(1);
    const [entry] = ackKudosManifest.pricing;
    expect(entry.amount).toBe(ACK_KUDOS_PRICE_ATOMIC);
    expect(entry.amount).toBe('10000');
    expect(entry.protocol).toBe('x402');
    expect(entry.asset).toBe(`eip155:2741/erc20:${USDC_ADDRESS.toLowerCase()}`);
    expect(entry.recipient).toBe(
      `eip155:2741:${ACK_TREASURY_ADDRESS.toLowerCase()}`
    );
  });

  it('uses a lowercase creator address for JCS hashing', () => {
    expect(ackKudosManifest.creatorAddress).toBe(
      ACK_TREASURY_ADDRESS.toLowerCase()
    );
    expect(ackKudosManifest.creatorAddress).toMatch(/^0x[0-9a-f]{40}$/);
  });

  it('uses lowercase discovery tags without duplicates', () => {
    const tags = ackKudosManifest.tags;
    expect(new Set(tags).size).toBe(tags.length);
    for (const tag of tags) {
      expect(tag).toMatch(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/);
      expect(tag.length).toBeLessThanOrEqual(32);
    }
  });
});
