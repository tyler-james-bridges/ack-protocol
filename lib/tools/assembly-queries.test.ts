import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseEther } from 'viem';
import { ASSEMBLY_ADDRESSES } from '@/lib/assembly';
import type { AssemblyPublicClient } from '@/lib/assembly';

function mockFetch(data: unknown, status = 200) {
  vi.mocked(global.fetch).mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as Response);
}

function memberTuple(
  overrides: {
    registered?: boolean;
    registeredAt?: bigint;
    lastHeartbeatAt?: bigint;
    activeUntil?: bigint;
  } = {}
) {
  return {
    registered: overrides.registered ?? true,
    registeredAt: overrides.registeredAt ?? BigInt(1_700_000_000),
    lastHeartbeatAt: overrides.lastHeartbeatAt ?? BigInt(1_700_100_000),
    activeUntil: overrides.activeUntil ?? BigInt(1_800_000_000),
  };
}

function proposalTuple(overrides: Record<string, unknown> = {}) {
  return {
    kind: 1,
    configRiskTier: 0,
    origin: 0,
    status: 1,
    proposer: '0x1111111111111111111111111111111111111111',
    threadId: BigInt(2),
    petitionId: BigInt(0),
    createdAt: BigInt(1_700_000_000),
    deliberationEndsAt: BigInt(1_700_010_000),
    voteStartAt: BigInt(1_700_010_000),
    voteEndAt: BigInt(1_800_000_000),
    timelockEndsAt: BigInt(0),
    activeSeatsSnapshot: BigInt(3),
    forVotes: BigInt(2),
    againstVotes: BigInt(0),
    abstainVotes: BigInt(0),
    amount: BigInt(0),
    snapshotAssetBalance: BigInt(0),
    transferIntent: false,
    intentDeadline: BigInt(0),
    intentMaxRiskTier: 0,
    title: 'Raise quorum',
    description: 'From 10% to 12%',
    ...overrides,
  };
}

describe('assembly-queries', () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function load() {
    return import('./assembly-queries');
  }

  it('maps heartbeat status from registry fields', async () => {
    const { heartbeatStatus } = await load();
    expect(
      heartbeatStatus({
        registered: false,
        active: false,
        lastHeartbeatAt: 0,
      })
    ).toBe('unregistered');
    expect(
      heartbeatStatus({
        registered: true,
        active: true,
        lastHeartbeatAt: 1,
      })
    ).toBe('active');
    expect(
      heartbeatStatus({
        registered: true,
        active: false,
        lastHeartbeatAt: 99,
      })
    ).toBe('expired');
    expect(
      heartbeatStatus({
        registered: true,
        active: false,
        lastHeartbeatAt: 0,
      })
    ).toBe('inactive');
  });

  it('lists members from the indexer snapshot plus onchain state', async () => {
    mockFetch([
      '0x1111111111111111111111111111111111111111',
      { address: '0x2222222222222222222222222222222222222222', name: 'Ada' },
    ]);

    const client = {
      multicall: vi.fn().mockResolvedValue([
        true,
        memberTuple(),
        false,
        memberTuple({
          registered: true,
          lastHeartbeatAt: BigInt(1_600_000_000),
          activeUntil: BigInt(1_650_000_000),
        }),
      ]),
    } as unknown as AssemblyPublicClient;

    const { queryMembers } = await load();
    const result = await queryMembers({ client, status: 'active', limit: 10 });

    expect(result.available).toBe(true);
    expect(result.rosterSource).toBe('indexer');
    expect(result.total).toBe(1);
    expect(result.members[0].address).toBe(
      '0x1111111111111111111111111111111111111111'
    );
    expect(result.members[0].status).toBe('active');
  });

  it('falls back to Registered events when the indexer is down', async () => {
    mockFetch({ error: 'missing' }, 404);

    const client = {
      getBlockNumber: vi.fn().mockResolvedValue(BigInt(43_782_700)),
      getContractEvents: vi.fn().mockResolvedValue([
        {
          args: { member: '0x3333333333333333333333333333333333333333' },
        },
      ]),
      multicall: vi.fn().mockResolvedValue([true, memberTuple()]),
    } as unknown as AssemblyPublicClient;

    const { queryMembers } = await load();
    const result = await queryMembers({ client });

    expect(result.rosterSource).toBe('registered_events');
    expect(result.warning).toMatch(/Indexer HTTP 404/);
    expect(result.members).toHaveLength(1);
    expect(result.members[0].address).toBe(
      '0x3333333333333333333333333333333333333333'
    );
  });

  it('returns an empty unavailable roster when indexer and event scan fail', async () => {
    mockFetch(null, 503);
    const client = {
      getBlockNumber: vi.fn().mockRejectedValue(new Error('rpc timeout')),
      getContractEvents: vi.fn(),
      multicall: vi.fn(),
    } as unknown as AssemblyPublicClient;

    const { queryMembers } = await load();
    const result = await queryMembers({ client });

    expect(result.available).toBe(false);
    expect(result.rosterSource).toBe('unavailable');
    expect(result.members).toEqual([]);
    expect(result.warning).toMatch(/rpc timeout/);
    expect(client.multicall).not.toHaveBeenCalled();
  });

  it('loads member_detail seats and voting power', async () => {
    const future = BigInt(Math.floor(Date.now() / 1000) + 86_400);
    const client = {
      readContract: vi.fn().mockImplementation(async ({ functionName }) => {
        switch (functionName) {
          case 'isActive':
            return true;
          case 'members':
            return memberTuple();
          case 'isCouncilMember':
            return true;
          case 'getVotingPower':
            return BigInt(2);
          case 'ownerSeatIds':
            return [BigInt(0)];
          case 'pendingReturns':
            return BigInt(0);
          default:
            throw new Error(String(functionName));
        }
      }),
      multicall: vi.fn().mockResolvedValue([
        {
          owner: '0x1111111111111111111111111111111111111111',
          startAt: BigInt(1_700_000_000),
          endAt: future,
          forfeited: false,
        },
      ]),
    } as unknown as AssemblyPublicClient;

    const { queryMemberDetail } = await load();
    const detail = await queryMemberDetail(
      '0x1111111111111111111111111111111111111111',
      { client }
    );

    expect(detail.votingPower).toBe(2);
    expect(detail.isCouncilMember).toBe(true);
    expect(detail.seats).toHaveLength(1);
    expect(detail.seats[0].active).toBe(true);
    expect(detail.status).toBe('active');
  });

  it('returns a clear empty proposals payload when proposalCount is 0', async () => {
    const client = {
      readContract: vi.fn().mockResolvedValue(BigInt(0)),
      multicall: vi.fn(),
    } as unknown as AssemblyPublicClient;

    const { queryProposals } = await load();
    const result = await queryProposals({ client });

    expect(result.available).toBe(true);
    expect(result.proposals).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.note).toMatch(/No proposals/);
    expect(client.multicall).not.toHaveBeenCalled();
  });

  it('returns a single proposal by id and filters in-flight status', async () => {
    const client = {
      readContract: vi
        .fn()
        .mockImplementation(async ({ functionName, args }) => {
          if (functionName === 'proposalCount') return BigInt(2);
          if (functionName === 'proposals') {
            const id = Number(args[0]);
            return proposalTuple({
              status: id === 1 ? 4 : 1,
              title: id === 1 ? 'Old' : 'Live',
            });
          }
          throw new Error(String(functionName));
        }),
      multicall: vi
        .fn()
        .mockResolvedValue([
          proposalTuple({ status: 4, title: 'Old' }),
          proposalTuple({ status: 1, title: 'Live' }),
        ]),
    } as unknown as AssemblyPublicClient;

    const { queryProposals } = await load();
    const one = await queryProposals({ client, proposalId: 2 });
    expect(one.proposals[0].title).toBe('Live');
    expect(one.proposals[0].status).toBe('active');

    const list = await queryProposals({ client, status: 'active' });
    expect(list.proposals).toHaveLength(1);
    expect(list.proposals[0].title).toBe('Live');

    const missing = await queryProposals({ client, proposalId: 9 });
    expect(missing.proposals).toEqual([]);
    expect(missing.note).toMatch(/does not exist/);
  });

  it('returns recent proposals when none are in flight', async () => {
    const client = {
      readContract: vi.fn().mockResolvedValue(BigInt(2)),
      multicall: vi
        .fn()
        .mockResolvedValue([
          proposalTuple({ status: 3, title: 'Done 1' }),
          proposalTuple({ status: 4, title: 'Done 2' }),
        ]),
    } as unknown as AssemblyPublicClient;

    const { queryProposals } = await load();
    const result = await queryProposals({ client, status: 'active', limit: 5 });
    expect(result.proposals[0].id).toBe(2);
    expect(result.note).toMatch(/No in-flight/);
  });

  it('aggregates governance stats from registry, council, governance, and forum', async () => {
    mockFetch({ ethUsdPrice: '2500' });
    const client = {
      readContract: vi.fn().mockImplementation(async ({ functionName }) => {
        switch (functionName) {
          case 'currentAuctionDay':
            return BigInt(12);
          case 'currentAuctionSlot':
            return 1;
          case 'seatCount':
            return BigInt(4);
          case 'auctions':
            return [
              '0x1111111111111111111111111111111111111111',
              parseEther('0.5'),
              false,
            ];
          case 'auctionWindowEnd':
            return BigInt(Math.floor(Date.now() / 1000) + 600);
          case 'activeMemberCount':
            return BigInt(7);
          case 'totalKnownMembers':
            return BigInt(11);
          case 'heartbeatFee':
            return BigInt(10) ** BigInt(15);
          case 'registrationFee':
            return BigInt(10) ** BigInt(16);
          case 'heartbeatGracePeriod':
            return 86400;
          case 'activeSeatSupply':
            return BigInt(3);
          case 'proposalCount':
            return BigInt(0);
          case 'dissolved':
            return false;
          case 'quorumBps':
            return BigInt(1000);
          case 'votePeriod':
            return BigInt(86400);
          case 'deliberationPeriod':
            return BigInt(172800);
          case 'timelockPeriod':
            return BigInt(86400);
          case 'threadCount':
            return BigInt(5);
          case 'commentCount':
            return BigInt(9);
          case 'petitionCount':
            return BigInt(1);
          default:
            throw new Error(String(functionName));
        }
      }),
    } as unknown as AssemblyPublicClient;

    const { queryGovernanceStats } = await load();
    const stats = await queryGovernanceStats({ client });

    expect(stats.chainId).toBe(2741);
    expect(stats.contracts).toEqual(ASSEMBLY_ADDRESSES);
    expect(stats.members).toMatchObject({ active: 7, totalKnown: 11 });
    expect(stats.council).toMatchObject({
      seatCount: 4,
      currentAuctionDay: 12,
    });
    expect(stats.governance).toMatchObject({
      proposalCount: 0,
      dissolved: false,
      quorumBps: 1000,
    });
    expect(stats.forum).toMatchObject({
      threadCount: 5,
      petitionCount: 1,
    });
    expect(String((stats.forum as { note: string }).note)).toMatch(/Forum/);
  });
});
