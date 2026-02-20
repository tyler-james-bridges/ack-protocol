import { NextRequest, NextResponse } from 'next/server';
import { createHash, createHmac } from 'crypto';

/**
 * Software Signature endpoint for ACK Protocol.
 *
 * This is NOT a hardware TEE attestation. It produces an HMAC-signed hash
 * of the submitted data, useful for tamper-detection but NOT for proving
 * execution inside a trusted enclave.
 */

const SIGNING_KEY = process.env.TEE_ATTESTATION_KEY;

export async function POST(request: NextRequest) {
  if (!SIGNING_KEY) {
    return NextResponse.json(
      { error: 'Signing service not configured' },
      { status: 503 }
    );
  }

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
    const signature = createHmac('sha256', SIGNING_KEY)
      .update(payload)
      .digest('hex');

    return NextResponse.json(
      {
        signed: true,
        type: 'software-hmac',
        notice:
          'This is a software HMAC signature, not a hardware TEE attestation.',
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
