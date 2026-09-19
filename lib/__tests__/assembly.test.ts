import { describe, it, expect } from 'vitest';
import {
  PROPOSAL_STATUS_LABELS,
  asNumber,
  isoTime,
  proposalStatusLabel,
} from '../assembly';

describe('assembly helpers', () => {
  it('converts bigint timestamps to ISO strings and treats 0 as null', () => {
    expect(isoTime(BigInt(0))).toBeNull();
    expect(isoTime(BigInt(1_700_000_000))).toBe('2023-11-14T22:13:20.000Z');
    expect(asNumber(BigInt(12))).toBe(12);
  });

  it('maps Governance ProposalStatus to CLI labels', () => {
    expect(proposalStatusLabel(0)).toEqual({
      status: 'pending',
      statusCode: 0,
    });
    expect(proposalStatusLabel(BigInt(1))).toEqual({
      status: 'active',
      statusCode: 1,
    });
    expect(PROPOSAL_STATUS_LABELS[5]).toBe('cancelled');
    expect(proposalStatusLabel(99).status).toBe('unknown-99');
  });
});
