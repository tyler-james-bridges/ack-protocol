/**
 * Onchain query helpers for the ACK Assembly ERC-8257 tool.
 *
 * Roster identity comes from the Assembly indexer when available, then
 * Registered-event fallback. All status, seats, votes, and stats are
 * read from Abstract contracts. Empty/unavailable sources are returned
 * as such — never synthesized.
 */

import { getAddress } from 'viem';
import { ETH_ADDRESS_RE } from '@/lib/tool-queries';
import {
  ASSEMBLY_ADDRESSES,
  ASSEMBLY_CHAIN_ID,
  ASSEMBLY_REGISTRY_DEPLOY_BLOCK,
  COUNCIL_ABI,
  FORUM_ABI,
  GOVERNANCE_ABI,
  IN_FLIGHT_PROPOSAL_STATUSES,
  REGISTRY_ABI,
  ZERO_ADDRESS,
  asBigInt,
  asNumber,
  fetchAuctionSnapshot,
  getAssemblyClient,
  getEthUsdPrice,
  getMemberSnapshotUrl,
  isoTime,
  proposalStatusLabel,
  type AssemblyPublicClient,
} from '@/lib/assembly';

export const MAX_ASSEMBLY_LIMIT = 50;
export const REGISTERED_EVENT_SCAN_STEP = BigInt(500_000);
export const REGISTERED_EVENT_SCAN_TIMEOUT_MS = 15_000;

export const ASSEMBLY_SOURCE = `on-chain (Abstract L2, chain ${ASSEMBLY_CHAIN_ID})`;

export interface MemberIdentity {
  address: `0x${string}`;
  ens?: string;
  name?: string;
}

export interface MemberListRow {
  address: `0x${string}`;
  status: string;
  active: boolean;
  registered: boolean;
  registeredAt: string | null;
  lastHeartbeatAt: string | null;
  activeUntil: string | null;
  ens?: string;
  name?: string;
}

export interface SeatOccupancy {
  id: number;
  owner: `0x${string}`;
  startAt: string | null;
  endAt: string | null;
  forfeited: boolean;
  active: boolean;
}

export interface MemberDetail {
  address: `0x${string}`;
  status: string;
  active: boolean;
  registered: boolean;
  registeredAt: string | null;
  lastHeartbeatAt: string | null;
  activeUntil: string | null;
  isCouncilMember: boolean;
  votingPower: number;
  seats: SeatOccupancy[];
  pendingReturnsWei: string;
}

export interface ProposalSummary {
  id: number;
  kind: number;
  configRiskTier: number;
  origin: number;
  status: string;
  statusCode: number;
  proposer: `0x${string}`;
  threadId: number;
  petitionId: number;
  createdAt: string | null;
  deliberationEndsAt: string | null;
  voteStartAt: string | null;
  voteEndAt: string | null;
  timelockEndsAt: string | null;
  activeSeatsSnapshot: number;
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  amount: string;
  title: string;
  description: string;
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function checksum(address: string): `0x${string}` {
  return getAddress(address) as `0x${string}`;
}

export function heartbeatStatus(input: {
  registered: boolean;
  active: boolean;
  lastHeartbeatAt: unknown;
}): string {
  if (!input.registered) return 'unregistered';
  if (input.active) return 'active';
  if (asNumber(input.lastHeartbeatAt) > 0) return 'expired';
  return 'inactive';
}

function decodeMemberTuple(value: unknown): {
  registered: boolean;
  registeredAt: bigint;
  lastHeartbeatAt: bigint;
  activeUntil: bigint;
} {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const row = value as Record<string, unknown>;
    return {
      registered: Boolean(row.registered),
      registeredAt: asBigInt(row.registeredAt),
      lastHeartbeatAt: asBigInt(row.lastHeartbeatAt),
      activeUntil: asBigInt(row.activeUntil),
    };
  }
  const tuple = value as unknown[];
  return {
    registered: Boolean(tuple?.[0]),
    registeredAt: asBigInt(tuple?.[1]),
    lastHeartbeatAt: asBigInt(tuple?.[2]),
    activeUntil: asBigInt(tuple?.[3]),
  };
}

function decodeSeatTuple(
  value: unknown,
  id: number,
  now: number
): SeatOccupancy {
  let owner: string = ZERO_ADDRESS;
  let startAt: unknown = 0;
  let endAt: unknown = 0;
  let forfeited = false;

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const row = value as Record<string, unknown>;
    owner = String(row.owner || ZERO_ADDRESS);
    startAt = row.startAt;
    endAt = row.endAt;
    forfeited = Boolean(row.forfeited);
  } else {
    const tuple = value as unknown[];
    owner = String(tuple?.[0] || ZERO_ADDRESS);
    startAt = tuple?.[1];
    endAt = tuple?.[2];
    forfeited = Boolean(tuple?.[3]);
  }

  const end = asNumber(endAt);
  return {
    id,
    owner: checksum(owner),
    startAt: isoTime(startAt),
    endAt: isoTime(endAt),
    forfeited,
    active: !forfeited && end > now && owner.toLowerCase() !== ZERO_ADDRESS,
  };
}

function decodeProposal(id: number, value: unknown): ProposalSummary {
  const row = (
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null
  ) as Record<string, unknown> | null;
  const tuple = Array.isArray(value) ? (value as unknown[]) : null;

  const pick = (key: string, index: number): unknown =>
    row ? row[key] : tuple?.[index];

  const status = proposalStatusLabel(pick('status', 3));
  const proposer = String(pick('proposer', 4) || ZERO_ADDRESS);

  return {
    id,
    kind: asNumber(pick('kind', 0)),
    configRiskTier: asNumber(pick('configRiskTier', 1)),
    origin: asNumber(pick('origin', 2)),
    status: status.status,
    statusCode: status.statusCode,
    proposer: checksum(proposer),
    threadId: asNumber(pick('threadId', 5)),
    petitionId: asNumber(pick('petitionId', 6)),
    createdAt: isoTime(pick('createdAt', 7)),
    deliberationEndsAt: isoTime(pick('deliberationEndsAt', 8)),
    voteStartAt: isoTime(pick('voteStartAt', 9)),
    voteEndAt: isoTime(pick('voteEndAt', 10)),
    timelockEndsAt: isoTime(pick('timelockEndsAt', 11)),
    activeSeatsSnapshot: asNumber(pick('activeSeatsSnapshot', 12)),
    forVotes: asBigInt(pick('forVotes', 13)).toString(),
    againstVotes: asBigInt(pick('againstVotes', 14)).toString(),
    abstainVotes: asBigInt(pick('abstainVotes', 15)).toString(),
    amount: asBigInt(pick('amount', 16)).toString(),
    title: String(pick('title', 21) ?? ''),
    description: String(pick('description', 22) ?? ''),
  };
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function parseSnapshotEntry(entry: unknown): MemberIdentity | null {
  if (typeof entry === 'string' && ETH_ADDRESS_RE.test(entry)) {
    return { address: checksum(entry) };
  }
  if (entry && typeof entry === 'object') {
    const row = entry as Record<string, unknown>;
    if (typeof row.address === 'string' && ETH_ADDRESS_RE.test(row.address)) {
      const identity: MemberIdentity = { address: checksum(row.address) };
      if (typeof row.ens === 'string' && row.ens) identity.ens = row.ens;
      if (typeof row.name === 'string' && row.name) identity.name = row.name;
      return identity;
    }
  }
  return null;
}

function mergeIdentities(entries: MemberIdentity[]): MemberIdentity[] {
  const byAddress = new Map<string, MemberIdentity>();
  for (const entry of entries) {
    const key = entry.address.toLowerCase();
    const existing = byAddress.get(key);
    if (!existing) {
      byAddress.set(key, entry);
      continue;
    }
    byAddress.set(key, {
      address: existing.address,
      ens: existing.ens ?? entry.ens,
      name: existing.name ?? entry.name,
    });
  }
  return [...byAddress.values()];
}

export async function fetchMemberSnapshot(
  url: string
): Promise<
  | { ok: true; members: MemberIdentity[] }
  | { ok: false; reason: string; status?: number }
> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      reason: `Indexer HTTP ${res.status}`,
      status: res.status,
    };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { ok: false, reason: 'Indexer returned non-JSON' };
  }

  const raw = Array.isArray(json)
    ? json
    : json &&
        typeof json === 'object' &&
        Array.isArray((json as { members?: unknown }).members)
      ? ((json as { members: unknown[] }).members as unknown[])
      : null;

  if (!raw) {
    return { ok: false, reason: 'Indexer response is not a member list' };
  }

  const parsed = raw
    .map(parseSnapshotEntry)
    .filter((entry): entry is MemberIdentity => entry !== null);
  return { ok: true, members: mergeIdentities(parsed) };
}

export async function membersFromRegisteredEvents(
  client: AssemblyPublicClient
): Promise<MemberIdentity[]> {
  const latestBlock = await client.getBlockNumber();
  const addresses = new Set<string>();

  for (
    let fromBlock = ASSEMBLY_REGISTRY_DEPLOY_BLOCK;
    fromBlock <= latestBlock;
    fromBlock += REGISTERED_EVENT_SCAN_STEP
  ) {
    const toBlock =
      fromBlock + REGISTERED_EVENT_SCAN_STEP - BigInt(1) > latestBlock
        ? latestBlock
        : fromBlock + REGISTERED_EVENT_SCAN_STEP - BigInt(1);
    const events = await client.getContractEvents({
      abi: REGISTRY_ABI,
      address: ASSEMBLY_ADDRESSES.registry,
      eventName: 'Registered',
      fromBlock,
      toBlock,
      strict: true,
    });

    for (const event of events) {
      const member = (event as { args?: { member?: string } }).args?.member;
      if (typeof member === 'string' && ETH_ADDRESS_RE.test(member)) {
        addresses.add(member);
      }
    }
  }

  return [...addresses].map((address) => ({ address: checksum(address) }));
}

export async function resolveMemberIdentities(
  client: AssemblyPublicClient,
  snapshotUrl: string = getMemberSnapshotUrl()
): Promise<{
  members: MemberIdentity[];
  source: 'indexer' | 'registered_events' | 'unavailable';
  warning?: string;
}> {
  const snapshot = await fetchMemberSnapshot(snapshotUrl);
  if (snapshot.ok) {
    return { members: snapshot.members, source: 'indexer' };
  }

  try {
    const fallback = await withTimeout(
      membersFromRegisteredEvents(client),
      REGISTERED_EVENT_SCAN_TIMEOUT_MS,
      `Registered event fallback timed out after ${REGISTERED_EVENT_SCAN_TIMEOUT_MS}ms`
    );
    return {
      members: fallback,
      source: 'registered_events',
      warning: `Member indexer unavailable (${snapshot.reason}); used on-chain Registered events.`,
    };
  } catch (error) {
    return {
      members: [],
      source: 'unavailable',
      warning: `Member roster is not available. Indexer: ${snapshot.reason}. Fallback: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

export async function fetchMemberOnchainState(
  client: AssemblyPublicClient,
  identities: MemberIdentity[]
): Promise<MemberListRow[]> {
  if (identities.length === 0) return [];

  const calls = identities.flatMap((identity) => [
    {
      abi: REGISTRY_ABI,
      address: ASSEMBLY_ADDRESSES.registry,
      functionName: 'isActive' as const,
      args: [identity.address] as const,
    },
    {
      abi: REGISTRY_ABI,
      address: ASSEMBLY_ADDRESSES.registry,
      functionName: 'members' as const,
      args: [identity.address] as const,
    },
  ]);

  const values = await client.multicall({
    allowFailure: false,
    contracts: calls,
  });

  return identities.map((identity, i) => {
    const active = Boolean(values[i * 2]);
    const info = decodeMemberTuple(values[i * 2 + 1]);
    return {
      address: identity.address,
      status: heartbeatStatus({
        registered: info.registered,
        active,
        lastHeartbeatAt: info.lastHeartbeatAt,
      }),
      active,
      registered: info.registered,
      registeredAt: isoTime(info.registeredAt),
      lastHeartbeatAt: isoTime(info.lastHeartbeatAt),
      activeUntil: isoTime(info.activeUntil),
      ens: identity.ens,
      name: identity.name,
    };
  });
}

export async function queryMembers(
  options: {
    status?: string;
    limit?: number;
    offset?: number;
    client?: AssemblyPublicClient;
  } = {}
): Promise<{
  members: MemberListRow[];
  count: number;
  total: number;
  available: boolean;
  source: string;
  rosterSource: 'indexer' | 'registered_events' | 'unavailable';
  warning?: string;
  limit: number;
  offset: number;
}> {
  const client = options.client ?? getAssemblyClient();
  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;
  const loaded = await resolveMemberIdentities(client);
  const rows = await fetchMemberOnchainState(client, loaded.members);

  const filtered = options.status
    ? rows.filter((row) => row.status === options.status)
    : rows;

  return {
    members: filtered.slice(offset, offset + limit),
    count: filtered.slice(offset, offset + limit).length,
    total: filtered.length,
    available: loaded.source !== 'unavailable',
    source: ASSEMBLY_SOURCE,
    rosterSource: loaded.source,
    warning: loaded.warning,
    limit,
    offset,
  };
}

export async function queryMemberDetail(
  address: string,
  options: { client?: AssemblyPublicClient } = {}
): Promise<MemberDetail> {
  const client = options.client ?? getAssemblyClient();
  const checksummed = checksum(address);
  const now = nowSeconds();

  const [active, memberTuple, isCouncilMember, votingPower, seatIds, pending] =
    await Promise.all([
      client.readContract({
        address: ASSEMBLY_ADDRESSES.registry,
        abi: REGISTRY_ABI,
        functionName: 'isActive',
        args: [checksummed],
      }),
      client.readContract({
        address: ASSEMBLY_ADDRESSES.registry,
        abi: REGISTRY_ABI,
        functionName: 'members',
        args: [checksummed],
      }),
      client.readContract({
        address: ASSEMBLY_ADDRESSES.councilSeats,
        abi: COUNCIL_ABI,
        functionName: 'isCouncilMember',
        args: [checksummed],
      }),
      client.readContract({
        address: ASSEMBLY_ADDRESSES.councilSeats,
        abi: COUNCIL_ABI,
        functionName: 'getVotingPower',
        args: [checksummed],
      }),
      client.readContract({
        address: ASSEMBLY_ADDRESSES.councilSeats,
        abi: COUNCIL_ABI,
        functionName: 'ownerSeatIds',
        args: [checksummed],
      }),
      client.readContract({
        address: ASSEMBLY_ADDRESSES.councilSeats,
        abi: COUNCIL_ABI,
        functionName: 'pendingReturns',
        args: [checksummed],
      }),
    ]);

  const info = decodeMemberTuple(memberTuple);
  const ids = (seatIds as readonly bigint[]).map((id) => Number(id));
  const seatTuples = ids.length
    ? await client.multicall({
        allowFailure: false,
        contracts: ids.map((id) => ({
          abi: COUNCIL_ABI,
          address: ASSEMBLY_ADDRESSES.councilSeats,
          functionName: 'seats' as const,
          args: [BigInt(id)] as const,
        })),
      })
    : [];

  return {
    address: checksummed,
    status: heartbeatStatus({
      registered: info.registered,
      active: Boolean(active),
      lastHeartbeatAt: info.lastHeartbeatAt,
    }),
    active: Boolean(active),
    registered: info.registered,
    registeredAt: isoTime(info.registeredAt),
    lastHeartbeatAt: isoTime(info.lastHeartbeatAt),
    activeUntil: isoTime(info.activeUntil),
    isCouncilMember: Boolean(isCouncilMember),
    votingPower: asNumber(votingPower),
    seats: ids.map((id, i) => decodeSeatTuple(seatTuples[i], id, now)),
    pendingReturnsWei: asBigInt(pending).toString(),
  };
}

export async function queryProposals(
  options: {
    status?: string;
    proposalId?: number;
    limit?: number;
    client?: AssemblyPublicClient;
  } = {}
): Promise<{
  proposals: ProposalSummary[];
  count: number;
  total: number;
  available: boolean;
  source: string;
  note?: string;
}> {
  const client = options.client ?? getAssemblyClient();
  const limit = options.limit ?? 20;

  const countRaw = await client.readContract({
    address: ASSEMBLY_ADDRESSES.governance,
    abi: GOVERNANCE_ABI,
    functionName: 'proposalCount',
  });
  const total = asNumber(countRaw);

  if (total === 0) {
    return {
      proposals: [],
      count: 0,
      total: 0,
      available: true,
      source: ASSEMBLY_SOURCE,
      note: 'No proposals have been submitted on the Governance contract yet. Forum threads/petitions are separate from onchain proposals.',
    };
  }

  if (options.proposalId != null) {
    if (options.proposalId < 1 || options.proposalId > total) {
      return {
        proposals: [],
        count: 0,
        total,
        available: true,
        source: ASSEMBLY_SOURCE,
        note: `Proposal ${options.proposalId} does not exist (proposalCount: ${total}).`,
      };
    }
    const raw = await client.readContract({
      address: ASSEMBLY_ADDRESSES.governance,
      abi: GOVERNANCE_ABI,
      functionName: 'proposals',
      args: [BigInt(options.proposalId)],
    });
    return {
      proposals: [decodeProposal(options.proposalId, raw)],
      count: 1,
      total,
      available: true,
      source: ASSEMBLY_SOURCE,
    };
  }

  const ids = Array.from({ length: total }, (_, i) => i + 1);
  const tuples = await client.multicall({
    allowFailure: false,
    contracts: ids.map((id) => ({
      abi: GOVERNANCE_ABI,
      address: ASSEMBLY_ADDRESSES.governance,
      functionName: 'proposals' as const,
      args: [BigInt(id)] as const,
    })),
  });

  let proposals = ids.map((id, i) => decodeProposal(id, tuples[i]));
  const statusFilter = options.status?.toLowerCase();
  if (statusFilter && statusFilter !== 'all') {
    if (statusFilter === 'recent') {
      proposals = [...proposals].sort((a, b) => b.id - a.id);
    } else if (statusFilter === 'active') {
      const inFlight = proposals.filter((p) =>
        IN_FLIGHT_PROPOSAL_STATUSES.has(p.status)
      );
      proposals =
        inFlight.length > 0
          ? inFlight
          : [...proposals].sort((a, b) => b.id - a.id);
    } else {
      proposals = proposals.filter((p) => p.status === statusFilter);
    }
  } else {
    const inFlight = proposals.filter((p) =>
      IN_FLIGHT_PROPOSAL_STATUSES.has(p.status)
    );
    proposals =
      inFlight.length > 0
        ? inFlight
        : [...proposals].sort((a, b) => b.id - a.id);
  }

  const sliced = proposals.slice(0, limit);
  const showingRecentFallback =
    sliced.length > 0 &&
    !sliced.some((p) => IN_FLIGHT_PROPOSAL_STATUSES.has(p.status)) &&
    (!statusFilter || statusFilter === 'active');
  return {
    proposals: sliced,
    count: sliced.length,
    total,
    available: true,
    source: ASSEMBLY_SOURCE,
    note: showingRecentFallback
      ? 'No in-flight proposals; returning most recent by id.'
      : undefined,
  };
}

export async function queryGovernanceStats(
  options: { client?: AssemblyPublicClient } = {}
): Promise<Record<string, unknown>> {
  const client = options.client ?? getAssemblyClient();
  const ethUsdPrice = await getEthUsdPrice();
  const auctions = await fetchAuctionSnapshot(client, ethUsdPrice);

  const [
    activeMemberCount,
    totalKnownMembers,
    heartbeatFee,
    registrationFee,
    heartbeatGracePeriod,
    activeSeatSupply,
    proposalCount,
    dissolved,
    quorumBps,
    votePeriod,
    deliberationPeriod,
    timelockPeriod,
    threadCount,
    commentCount,
    petitionCount,
  ] = await Promise.all([
    client.readContract({
      address: ASSEMBLY_ADDRESSES.registry,
      abi: REGISTRY_ABI,
      functionName: 'activeMemberCount',
    }),
    client.readContract({
      address: ASSEMBLY_ADDRESSES.registry,
      abi: REGISTRY_ABI,
      functionName: 'totalKnownMembers',
    }),
    client.readContract({
      address: ASSEMBLY_ADDRESSES.registry,
      abi: REGISTRY_ABI,
      functionName: 'heartbeatFee',
    }),
    client.readContract({
      address: ASSEMBLY_ADDRESSES.registry,
      abi: REGISTRY_ABI,
      functionName: 'registrationFee',
    }),
    client.readContract({
      address: ASSEMBLY_ADDRESSES.registry,
      abi: REGISTRY_ABI,
      functionName: 'heartbeatGracePeriod',
    }),
    client.readContract({
      address: ASSEMBLY_ADDRESSES.councilSeats,
      abi: COUNCIL_ABI,
      functionName: 'activeSeatSupply',
    }),
    client.readContract({
      address: ASSEMBLY_ADDRESSES.governance,
      abi: GOVERNANCE_ABI,
      functionName: 'proposalCount',
    }),
    client.readContract({
      address: ASSEMBLY_ADDRESSES.governance,
      abi: GOVERNANCE_ABI,
      functionName: 'dissolved',
    }),
    client.readContract({
      address: ASSEMBLY_ADDRESSES.governance,
      abi: GOVERNANCE_ABI,
      functionName: 'quorumBps',
    }),
    client.readContract({
      address: ASSEMBLY_ADDRESSES.governance,
      abi: GOVERNANCE_ABI,
      functionName: 'votePeriod',
    }),
    client.readContract({
      address: ASSEMBLY_ADDRESSES.governance,
      abi: GOVERNANCE_ABI,
      functionName: 'deliberationPeriod',
    }),
    client.readContract({
      address: ASSEMBLY_ADDRESSES.governance,
      abi: GOVERNANCE_ABI,
      functionName: 'timelockPeriod',
    }),
    client.readContract({
      address: ASSEMBLY_ADDRESSES.forum,
      abi: FORUM_ABI,
      functionName: 'threadCount',
    }),
    client.readContract({
      address: ASSEMBLY_ADDRESSES.forum,
      abi: FORUM_ABI,
      functionName: 'commentCount',
    }),
    client.readContract({
      address: ASSEMBLY_ADDRESSES.forum,
      abi: FORUM_ABI,
      functionName: 'petitionCount',
    }),
  ]);

  return {
    source: ASSEMBLY_SOURCE,
    chainId: ASSEMBLY_CHAIN_ID,
    contracts: ASSEMBLY_ADDRESSES,
    members: {
      active: asNumber(activeMemberCount),
      totalKnown: asNumber(totalKnownMembers),
      registrationFeeWei: asBigInt(registrationFee).toString(),
      heartbeatFeeWei: asBigInt(heartbeatFee).toString(),
      heartbeatGracePeriodSeconds: asNumber(heartbeatGracePeriod),
    },
    council: {
      seatCount: auctions.seatCount,
      activeSeatSupply: asNumber(activeSeatSupply),
      currentAuctionDay: auctions.currentDay,
      currentAuctionSlot: auctions.currentSlot,
      auctions: auctions.auctions,
    },
    governance: {
      proposalCount: asNumber(proposalCount),
      dissolved: Boolean(dissolved),
      quorumBps: asNumber(quorumBps),
      votePeriodSeconds: asNumber(votePeriod),
      deliberationPeriodSeconds: asNumber(deliberationPeriod),
      timelockPeriodSeconds: asNumber(timelockPeriod),
    },
    forum: {
      threadCount: asNumber(threadCount),
      commentCount: asNumber(commentCount),
      petitionCount: asNumber(petitionCount),
      note: 'Forum stores threads, comments, and petitions. Binding proposals live on the Governance contract.',
    },
    ethUsdPrice,
    timestamp: new Date().toISOString(),
  };
}
