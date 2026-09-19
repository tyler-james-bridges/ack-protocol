/**
 * AI Assembly onchain helpers (Abstract L2).
 *
 * Addresses match the Assembly CLI / theaiassembly.org deployments.
 * Used by GET /api/assembly and the ERC-8257 assembly tool.
 */

import {
  createPublicClient,
  formatEther,
  http,
  parseAbi,
  type Address,
} from 'viem';
import { abstract } from 'viem/chains';

export const ASSEMBLY_CHAIN_ID = 2741;

export const ASSEMBLY_ADDRESSES = {
  registry: '0x0A013Ca2Df9d6C399F9597d438d79Be71B43cb63',
  councilSeats: '0xc37cC38F4e463F50745Bdf9F306Ce6b4b6335717',
  forum: '0x90095f88859ACd5f1733F44EdD509ba2e1293047',
  governance: '0xe82a25937e07a3855d8B8352b85fF4B4Aa3fb0C0',
  treasury: '0xC2e6DDbdc1A8e4DcCc60A78B6Faa197967a8FEb9',
} as const satisfies Record<string, Address>;

/** Registry deployment block on Abstract (abscan.org). */
export const ASSEMBLY_REGISTRY_DEPLOY_BLOCK = BigInt(43_782_651);

export const DEFAULT_MEMBER_SNAPSHOT_URL =
  'https://www.theaiassembly.org/api/indexer/members';

export const ETH_USD_SNAPSHOT_URL =
  'https://indexer.theaiassembly.org/snapshot';

export const ZERO_ADDRESS =
  '0x0000000000000000000000000000000000000000' as Address;

export const REGISTRY_ABI = parseAbi([
  'function activeMemberCount() view returns (uint256)',
  'function totalKnownMembers() view returns (uint256)',
  'function heartbeatFee() view returns (uint256)',
  'function registrationFee() view returns (uint256)',
  'function heartbeatGracePeriod() view returns (uint40)',
  'function isActive(address account) view returns (bool)',
  'function members(address account) view returns (bool registered, uint256 registeredAt, uint256 lastHeartbeatAt, uint256 activeUntil)',
  'event Registered(address indexed member, uint256 paidAmount, uint256 activeUntil)',
]);

export const COUNCIL_ABI = parseAbi([
  'function seatCount() view returns (uint256)',
  'function activeSeatSupply() view returns (uint256)',
  'function currentAuctionDay() view returns (uint256)',
  'function currentAuctionSlot() view returns (uint8)',
  'function auctions(uint256 day, uint8 slot) view returns (address highestBidder, uint256 highestBid, bool settled)',
  'function auctionWindowEnd(uint256 day, uint8 slot) view returns (uint256)',
  'function seats(uint256 seatId) view returns (address owner, uint256 startAt, uint256 endAt, bool forfeited)',
  'function getVotingPower(address account) view returns (uint256)',
  'function isCouncilMember(address account) view returns (bool)',
  'function ownerSeatIds(address account) view returns (uint256[])',
  'function pendingReturns(address account) view returns (uint256)',
]);

export const GOVERNANCE_ABI = parseAbi([
  'function proposalCount() view returns (uint256)',
  'function dissolved() view returns (bool)',
  'function quorumBps() view returns (uint256)',
  'function votePeriod() view returns (uint256)',
  'function deliberationPeriod() view returns (uint256)',
  'function timelockPeriod() view returns (uint256)',
  'function forum() view returns (address)',
  'function proposals(uint256 proposalId) view returns (uint8 kind, uint8 configRiskTier, uint8 origin, uint8 status, address proposer, uint256 threadId, uint256 petitionId, uint256 createdAt, uint256 deliberationEndsAt, uint256 voteStartAt, uint256 voteEndAt, uint256 timelockEndsAt, uint256 activeSeatsSnapshot, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes, uint256 amount, uint256 snapshotAssetBalance, bool transferIntent, uint64 intentDeadline, uint8 intentMaxRiskTier, string title, string description)',
]);

export const FORUM_ABI = parseAbi([
  'function threadCount() view returns (uint256)',
  'function commentCount() view returns (uint256)',
  'function petitionCount() view returns (uint256)',
]);

/**
 * Governance.sol ProposalStatus on Abstract mainnet:
 * Deliberation, Voting, Timelock, Executed, Defeated, Cancelled
 *
 * Labels match the Assembly CLI so agents can correlate with `assembly-cli`.
 */
export const PROPOSAL_STATUS_LABELS: Record<number, string> = {
  0: 'pending',
  1: 'active',
  2: 'passed',
  3: 'executed',
  4: 'defeated',
  5: 'cancelled',
};

export const IN_FLIGHT_PROPOSAL_STATUSES = new Set([
  'pending',
  'active',
  'passed',
]);

export type AssemblyPublicClient = {
  readContract: (...args: unknown[]) => Promise<unknown>;
  multicall: (...args: unknown[]) => Promise<readonly unknown[]>;
  getContractEvents: (...args: unknown[]) => Promise<readonly unknown[]>;
  getBlockNumber: () => Promise<bigint>;
};

let cachedClient: AssemblyPublicClient | undefined;

export function getAssemblyRpcUrl(): string {
  return process.env.ABSTRACT_RPC_URL || 'https://api.mainnet.abs.xyz';
}

export function getMemberSnapshotUrl(): string {
  return process.env.ASSEMBLY_INDEXER_URL || DEFAULT_MEMBER_SNAPSHOT_URL;
}

export function getAssemblyClient(): AssemblyPublicClient {
  if (!cachedClient) {
    cachedClient = createPublicClient({
      chain: abstract,
      transport: http(getAssemblyRpcUrl()),
    }) as unknown as AssemblyPublicClient;
  }
  return cachedClient;
}

/** Test-only: drop the memoized client. */
export function resetAssemblyClient(): void {
  cachedClient = undefined;
}

export function asNumber(value: unknown): number {
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

export function asBigInt(value: unknown): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return BigInt(value);
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    return BigInt(value.trim());
  }
  return BigInt(0);
}

export function isoTime(value: unknown): string | null {
  const seconds = asNumber(value);
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}

export function proposalStatusLabel(status: unknown): {
  status: string;
  statusCode: number;
} {
  const statusCode = asNumber(status);
  return {
    status: PROPOSAL_STATUS_LABELS[statusCode] ?? `unknown-${statusCode}`,
    statusCode,
  };
}

export interface AuctionSlot {
  day: number;
  slot: number;
  highestBidder: string;
  highestBidEth: string;
  highestBidUsd: string;
  settled: boolean;
  timeRemainingSeconds: number;
  status: string;
}

export async function getEthUsdPrice(): Promise<number> {
  try {
    const res = await fetch(ETH_USD_SNAPSHOT_URL);
    if (!res.ok) return 1970;
    const data = (await res.json()) as { ethUsdPrice?: string };
    return parseFloat(data.ethUsdPrice || '') || 1970;
  } catch {
    return 1970;
  }
}

export async function fetchAuctionSnapshot(
  client: AssemblyPublicClient,
  ethPrice: number,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): Promise<{
  currentDay: number;
  currentSlot: number;
  seatCount: number;
  auctions: AuctionSlot[];
}> {
  const [currentDay, currentSlot, seatCount] = await Promise.all([
    client.readContract({
      address: ASSEMBLY_ADDRESSES.councilSeats,
      abi: COUNCIL_ABI,
      functionName: 'currentAuctionDay',
    }),
    client.readContract({
      address: ASSEMBLY_ADDRESSES.councilSeats,
      abi: COUNCIL_ABI,
      functionName: 'currentAuctionSlot',
    }),
    client.readContract({
      address: ASSEMBLY_ADDRESSES.councilSeats,
      abi: COUNCIL_ABI,
      functionName: 'seatCount',
    }),
  ]);

  const day = asNumber(currentDay);
  const slot = asNumber(currentSlot);
  const slots: AuctionSlot[] = [];

  for (let s = 0; s < 4; s++) {
    try {
      const [auction, windowEnd] = await Promise.all([
        client.readContract({
          address: ASSEMBLY_ADDRESSES.councilSeats,
          abi: COUNCIL_ABI,
          functionName: 'auctions',
          args: [BigInt(day), s],
        }),
        client.readContract({
          address: ASSEMBLY_ADDRESSES.councilSeats,
          abi: COUNCIL_ABI,
          functionName: 'auctionWindowEnd',
          args: [BigInt(day), s],
        }),
      ]);

      const asObject =
        auction && typeof auction === 'object' && !Array.isArray(auction)
          ? (auction as {
              highestBidder?: string;
              highestBid?: bigint;
              settled?: boolean;
            })
          : null;
      const asTuple = auction as readonly [string, bigint, boolean];
      const highestBidder = (asObject?.highestBidder ?? asTuple[0]) as string;
      const highestBid = (asObject?.highestBid ?? asTuple[1]) as bigint;
      const settled = Boolean(asObject?.settled ?? asTuple[2]);
      const bidEth = formatEther(highestBid);
      const timeLeft = asNumber(windowEnd) - nowSeconds;

      let status = 'upcoming';
      if (settled) status = 'settled';
      else if (timeLeft <= 0) status = 'ended_pending_settlement';
      else if (timeLeft <= 300) status = 'closing_soon';
      else status = 'active';

      slots.push({
        day,
        slot: s,
        highestBidder,
        highestBidEth: bidEth,
        highestBidUsd: `$${(parseFloat(bidEth) * ethPrice).toFixed(2)}`,
        settled,
        timeRemainingSeconds: Math.max(0, timeLeft),
        status,
      });
    } catch {
      // Slot may not exist yet
    }
  }

  return {
    currentDay: day,
    currentSlot: slot,
    seatCount: asNumber(seatCount),
    auctions: slots,
  };
}
