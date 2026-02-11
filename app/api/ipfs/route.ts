import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    return NextResponse.json(
      { error: 'IPFS upload not configured' },
      { status: 503 }
    );
  }

  const body = await request.json();

  const response = await fetch(
    'https://api.pinata.cloud/pinning/pinJSONToIPFS',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    return NextResponse.json(
      { error: `IPFS upload failed: ${error}` },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}
