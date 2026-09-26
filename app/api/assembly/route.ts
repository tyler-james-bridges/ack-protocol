import { NextResponse } from 'next/server';
import {
  fetchAuctionSnapshot,
  getAssemblyClient,
  getEthUsdPrice,
} from '@/lib/assembly';

export async function GET() {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'X-Powered-By': 'ACK Protocol',
  };

  try {
    const ethPrice = await getEthUsdPrice();
    const data = await fetchAuctionSnapshot(getAssemblyClient(), ethPrice);

    return NextResponse.json(
      {
        service: 'assembly-intel',
        version: '1.0.0',
        description:
          'Live AI Assembly Council auction data, read directly from Abstract L2 chain state.',
        ethUsdPrice: ethPrice,
        ...data,
        timestamp: new Date().toISOString(),
        source: 'on-chain (Abstract L2, chain 2741)',
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
