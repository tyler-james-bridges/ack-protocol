import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQueryMembers = vi.fn();
const mockQueryMemberDetail = vi.fn();
const mockQueryProposals = vi.fn();
const mockQueryGovernanceStats = vi.fn();

vi.mock('./assembly-queries', () => ({
  MAX_ASSEMBLY_LIMIT: 50,
  queryMembers: (...args: unknown[]) => mockQueryMembers(...args),
  queryMemberDetail: (...args: unknown[]) => mockQueryMemberDetail(...args),
  queryProposals: (...args: unknown[]) => mockQueryProposals(...args),
  queryGovernanceStats: (...args: unknown[]) =>
    mockQueryGovernanceStats(...args),
}));

import { handleAssemblyTool } from './assembly-handler';

describe('handleAssemblyTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a missing body', async () => {
    const result = await handleAssemblyTool(null);
    expect(result.status).toBe(400);
    expect(result.body.error).toContain('JSON object');
  });

  it('rejects a missing action', async () => {
    const result = await handleAssemblyTool({});
    expect(result.status).toBe(400);
    expect(result.body.error).toContain('action is required');
  });

  it('rejects an unknown action', async () => {
    const result = await handleAssemblyTool({ action: 'reputation' });
    expect(result.status).toBe(400);
    expect(result.body.error).toContain('Invalid action');
    expect(String(result.body.error)).toContain('members');
  });

  it('rejects a limit outside 1-50', async () => {
    const result = await handleAssemblyTool({ action: 'members', limit: 99 });
    expect(result.status).toBe(400);
    expect(result.body.error).toContain('limit');
  });

  it('returns a member list', async () => {
    mockQueryMembers.mockResolvedValue({
      members: [{ address: '0x1111111111111111111111111111111111111111' }],
      count: 1,
      total: 1,
      available: true,
    });
    const result = await handleAssemblyTool({
      action: 'members',
      status: 'active',
      limit: 5,
    });
    expect(result.status).toBe(200);
    expect(result.body.count).toBe(1);
    expect(mockQueryMembers).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active', limit: 5 })
    );
  });

  it('requires address for member_detail', async () => {
    const result = await handleAssemblyTool({ action: 'member_detail' });
    expect(result.status).toBe(400);
    expect(result.body.error).toContain('address is required');
  });

  it('rejects an invalid address for member_detail', async () => {
    const result = await handleAssemblyTool({
      action: 'member_detail',
      address: 'not-an-address',
    });
    expect(result.status).toBe(400);
    expect(result.body.error).toContain('valid Ethereum address');
  });

  it('returns member detail on success', async () => {
    mockQueryMemberDetail.mockResolvedValue({
      address: '0x1111111111111111111111111111111111111111',
      votingPower: 2,
      seats: [],
    });
    const result = await handleAssemblyTool({
      action: 'member_detail',
      address: '0x1111111111111111111111111111111111111111',
    });
    expect(result.status).toBe(200);
    expect(result.body.member).toMatchObject({ votingPower: 2 });
  });

  it('returns proposals including an empty onchain set', async () => {
    mockQueryProposals.mockResolvedValue({
      proposals: [],
      count: 0,
      total: 0,
      available: true,
      note: 'No proposals have been submitted',
    });
    const result = await handleAssemblyTool({ action: 'proposals' });
    expect(result.status).toBe(200);
    expect(result.body.proposals).toEqual([]);
    expect(result.body.available).toBe(true);
  });

  it('rejects a non-positive proposalId', async () => {
    const result = await handleAssemblyTool({
      action: 'proposals',
      proposalId: 0,
    });
    expect(result.status).toBe(400);
    expect(result.body.error).toContain('proposalId');
  });

  it('returns governance stats', async () => {
    mockQueryGovernanceStats.mockResolvedValue({
      members: { active: 3 },
      council: { seatCount: 4 },
    });
    const result = await handleAssemblyTool({ action: 'governance_stats' });
    expect(result.status).toBe(200);
    expect(result.body.members).toEqual({ active: 3 });
  });

  it('maps query failures to 500', async () => {
    mockQueryGovernanceStats.mockRejectedValue(new Error('rpc down'));
    const result = await handleAssemblyTool({ action: 'governance_stats' });
    expect(result.status).toBe(500);
    expect(result.body.error).toContain('rpc down');
  });
});
