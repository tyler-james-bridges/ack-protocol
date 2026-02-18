import { NextRequest, NextResponse } from 'next/server';
import { createHash, createHmac } from 'crypto';

/**
 * TEE Attestation Verification endpoint for ACK Protocol.
 * Accepts POST with { "data": "..." } and returns a signed attestation hash.
 */

const ATTESTATION_KEY =
  process.env.TEE_ATTESTATION_KEY || 'ack-software-attestation-key';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.data || typeof body.data !== 'string') {
      return NextResponse.json(
        {
          error: 'Missing or invalid "data" field. Expected { "data": "..." }',
        },
        { status: 400 }
      );
    }

    const dataHash = createHash('sha256').update(body.data).digest('hex');
    const timestamp = Date.now();
    const payload = `${dataHash}:${timestamp}`;
    const signature = createHmac('sha256', ATTESTATION_KEY)
      .update(payload)
      .digest('hex');

    return NextResponse.json(
      {
        verified: true,
        attestationType: 'software-attestation',
        dataHash,
        timestamp,
        signature,
        agent: 'ACK',
        agentId: '606',
        chainId: 2741,
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body. Expected JSON with "data" field.' },
      { status: 400 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}
