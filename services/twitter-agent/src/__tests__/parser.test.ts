import { describe, it, expect } from 'vitest';
import {
  parseAllKudos,
  parseKudos,
  parseClaimCode,
  isValidKudos,
} from '../parser';

describe('parseAllKudos', () => {
  // -- existing kudos behavior (no tips) --

  it('parses basic @handle ++', () => {
    const r = parseAllKudos('@ack_onchain @agent0 ++');
    expect(r).toHaveLength(1);
    expect(r[0].targetHandle).toBe('agent0');
    expect(r[0].sentiment).toBe('positive');
    expect(r[0].amount).toBe(1);
    expect(r[0].tipAmountUsd).toBeUndefined();
  });

  it('parses @handle ++ with category and message', () => {
    const r = parseAllKudos('@ack_onchain @agent0 ++ reliable "great work"');
    expect(r[0].category).toBe('reliable');
    expect(r[0].message).toBe('great work');
    expect(r[0].tipAmountUsd).toBeUndefined();
  });

  it('parses @handle -- negative', () => {
    const r = parseAllKudos('@ack_onchain @agent0 --');
    expect(r[0].sentiment).toBe('negative');
  });

  it('parses explicit kudos amount (no $)', () => {
    const r = parseAllKudos('@ack_onchain @agent0 ++ 5');
    expect(r[0].amount).toBe(5);
    expect(r[0].tipAmountUsd).toBeUndefined();
  });

  it('clamps kudos amount to 100', () => {
    const r = parseAllKudos('@ack_onchain @agent0 ++ 999');
    expect(r[0].amount).toBe(100);
  });

  it('parses multiple agents', () => {
    const r = parseAllKudos('@ack_onchain @alice ++ @bob --');
    expect(r).toHaveLength(2);
    expect(r[0].targetHandle).toBe('alice');
    expect(r[1].targetHandle).toBe('bob');
  });

  it('parses explicit agent id with # syntax', () => {
    const r = parseAllKudos('ACK: @ack_onchain #649 ++ $1 reliable');
    expect(r).toHaveLength(1);
    expect(r[0].targetAgentId).toBe(649);
    expect(r[0].targetHandle).toBeUndefined();
    expect(r[0].tipAmountUsd).toBe(1);
    expect(r[0].category).toBe('reliable');
  });

  it('parses explicit agent id with agent: syntax', () => {
    const r = parseAllKudos('ACK: @ack_onchain agent:606 --');
    expect(r).toHaveLength(1);
    expect(r[0].targetAgentId).toBe(606);
    expect(r[0].sentiment).toBe('negative');
  });

  // -- tip amount parsing --

  it('parses $5 tip', () => {
    const r = parseAllKudos('@ack_onchain @agent0 ++ $5');
    expect(r[0].tipAmountUsd).toBe(5);
    expect(r[0].amount).toBe(1);
  });

  it('parses $0.50 tip', () => {
    const r = parseAllKudos('@ack_onchain @agent0 ++ $0.50');
    expect(r[0].tipAmountUsd).toBe(0.5);
  });

  it('parses $1.00 tip with category and message', () => {
    const r = parseAllKudos(
      '@ack_onchain @agent0 ++ $1.00 reliable "saved my pipeline"'
    );
    expect(r[0].tipAmountUsd).toBe(1);
    expect(r[0].category).toBe('reliable');
    expect(r[0].message).toBe('saved my pipeline');
    expect(r[0].amount).toBe(1);
  });

  it('parses $0.01 minimum tip', () => {
    const r = parseAllKudos('@ack_onchain @agent0 ++ $0.01');
    expect(r[0].tipAmountUsd).toBe(0.01);
  });

  it('clamps tip to $100 max', () => {
    const r = parseAllKudos('@ack_onchain @agent0 ++ $500');
    expect(r[0].tipAmountUsd).toBe(100);
  });

  it('ignores tip below $0.01', () => {
    const r = parseAllKudos('@ack_onchain @agent0 ++ $0.001');
    // $0.001 has 3 decimal places so the regex only captures $0.00
    // which is below minimum, so undefined
    expect(r[0].tipAmountUsd).toBeUndefined();
  });

  it('does not treat bare number as tip (no $ prefix)', () => {
    const r = parseAllKudos('@ack_onchain @agent0 ++ 5');
    expect(r[0].tipAmountUsd).toBeUndefined();
    expect(r[0].amount).toBe(5);
  });

  it('parses tip on negative kudos', () => {
    const r = parseAllKudos('@ack_onchain @agent0 -- $2.50');
    expect(r[0].sentiment).toBe('negative');
    expect(r[0].tipAmountUsd).toBe(2.5);
  });

  // -- bare ++/-- (kudos to ACK itself) with tips --

  it('parses bare ++ $5 as tip to ack_onchain', () => {
    const r = parseAllKudos('@ack_onchain ++ $5');
    expect(r[0].targetHandle).toBe('ack_onchain');
    expect(r[0].tipAmountUsd).toBe(5);
  });

  // -- reverse order with tips --

  it('parses reverse order ++ $3 @handle', () => {
    const r = parseAllKudos('@ack_onchain ++ $3 @agent0');
    expect(r[0].targetHandle).toBe('agent0');
    expect(r[0].tipAmountUsd).toBe(3);
  });

  // -- natural language fallback has no tip --

  it('natural language fallback has no tip', () => {
    const r = parseAllKudos(
      '@ack_onchain shoutout to @agent0 for being reliable'
    );
    expect(r).toHaveLength(1);
    expect(r[0].tipAmountUsd).toBeUndefined();
    expect(r[0].isExplicit).toBe(false);
  });

  it('does NOT fire kudos on bare @mentions without ++/--', () => {
    const r = parseAllKudos(
      '@ack_onchain after dark\n\nasked claude code to build the critical e2e flows. all passing on @AbstractChain.'
    );
    // Natural language fallback may match, but isExplicit should be false
    for (const cmd of r) {
      expect(cmd.isExplicit).toBe(false);
    }
  });
});

describe('parseKudos', () => {
  it('returns first result or null', () => {
    expect(parseKudos('@ack_onchain @agent0 ++ $1')).toMatchObject({
      targetHandle: 'agent0',
      tipAmountUsd: 1,
    });
    expect(parseKudos('nothing here')).toBeNull();
  });
});

describe('parseClaimCode', () => {
  it('extracts ack-claim codes', () => {
    expect(parseClaimCode('here is ack-claim-a1b2c3 done')).toBe(
      'ack-claim-a1b2c3'
    );
    expect(parseClaimCode('no code')).toBeNull();
  });
});

describe('isValidKudos', () => {
  it('validates handle length', () => {
    expect(
      isValidKudos({
        targetHandle: 'ok',
        amount: 1,
        isExplicit: true,
        sentiment: 'positive',
      })
    ).toBe(true);
    expect(
      isValidKudos({
        targetHandle: '',
        amount: 1,
        isExplicit: true,
        sentiment: 'positive',
      })
    ).toBe(false);
    expect(
      isValidKudos({
        targetHandle: 'a'.repeat(16),
        amount: 1,
        isExplicit: true,
        sentiment: 'positive',
      })
    ).toBe(false);
    expect(
      isValidKudos({
        targetAgentId: 649,
        amount: 1,
        isExplicit: true,
        sentiment: 'positive',
      })
    ).toBe(true);
  });
});
