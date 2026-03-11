import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, parseAbi, formatEther } from 'viem';

const ABSTRACT_CHAIN = {
  id: 2741,
  name: 'Abstract',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://api.mainnet.abs.xyz'] } },
} as const;

const COUNCIL_SEATS = '0xc37cC38F4e463F50745Bdf9F306Ce6b4b6335717' as const;
const REGISTRY = '0x0A013Ca2Df9d6C399F9597d438d79Be71B43cb63' as const;

const COUNCIL_ABI = parseAbi([
  'function auctions(uint256 day, uint8 slot) view returns (address highestBidder, uint256 highestBid, bool settled)',
  'function currentAuctionDay() view returns (uint256)',
  'function currentAuctionSlot() view returns (uint8)',
  'function auctionWindowEnd(uint256 day, uint8 slot) view returns (uint256)',
  'function seatCount() view returns (uint256)',
  'function pendingReturns(address) view returns (uint256)',
]);

interface AuctionSlot {
  day: number;
  slot: number;
  highestBidder: string;
  highestBidEth: string;
  highestBidUsd: string;
  settled: boolean;
  timeRemainingSeconds: number;
  status: string;
}

async function fetchAuctionData(ethPrice: number) {
  const client = createPublicClient({
    chain: ABSTRACT_CHAIN,
    transport: http(),
  });

  const [currentDay, currentSlot, seatCount] = await Promise.all([
    client.readContract({
      address: COUNCIL_SEATS,
      abi: COUNCIL_ABI,
      functionName: 'currentAuctionDay',
    }),
    client.readContract({
      address: COUNCIL_SEATS,
      abi: COUNCIL_ABI,
      functionName: 'currentAuctionSlot',
    }),
    client.readContract({
      address: COUNCIL_SEATS,
      abi: COUNCIL_ABI,
      functionName: 'seatCount',
    }),
  ]);

  const day = Number(currentDay);
  const slot = Number(currentSlot);
  const now = Math.floor(Date.now() / 1000);

  const slots: AuctionSlot[] = [];

  for (let s = 0; s < 4; s++) {
    try {
      const [auction, windowEnd] = await Promise.all([
        client.readContract({
          address: COUNCIL_SEATS,
          abi: COUNCIL_ABI,
          functionName: 'auctions',
          args: [BigInt(day), s as 0 | 1 | 2 | 3],
        }),
        client.readContract({
          address: COUNCIL_SEATS,
          abi: COUNCIL_ABI,
          functionName: 'auctionWindowEnd',
          args: [BigInt(day), s as 0 | 1 | 2 | 3],
        }),
      ]);

      const [highestBidder, highestBid, settled] = auction;
      const bidEth = formatEther(highestBid);
      const timeLeft = Number(windowEnd) - now;

      let status = 'upcoming';
      if (settled) status = 'settled';
      else if (timeLeft <= 0) status = 'ended_pending_settlement';
      else if (timeLeft <= 300) status = 'closing_soon';
      else status = 'active';

      slots.push({
        day,
        slot: s,
        highestBidder: highestBidder as string,
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
    seatCount: Number(seatCount),
    auctions: slots,
    timestamp: new Date().toISOString(),
    source: 'on-chain (Abstract L2, chain 2741)',
  };
}

async function getEthPrice(): Promise<number> {
  try {
    const indexer = await fetch('https://indexer.theaiassembly.org/snapshot');
    const data = await indexer.json();
    return parseFloat(data.ethUsdPrice) || 1970;
  } catch {
    return 1970;
  }
}

export async function GET(req: NextRequest) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'X-Powered-By': 'ACK Protocol',
  };

  try {
    const ethPrice = await getEthPrice();
    const data = await fetchAuctionData(ethPrice);

    return NextResponse.json(
      {
        service: 'assembly-intel',
        version: '1.0.0',
        description:
          'Live AI Assembly Council auction data, read directly from Abstract L2 chain state.',
        ethUsdPrice: ethPrice,
        ...data,
      },
      { status: 200, headers }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch auction data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Payment',
      },
    }
  );
}
