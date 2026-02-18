import { NextResponse } from 'next/server';

/**
 * TEE Attestation endpoint for ACK Protocol.
 * Returns attestation support information.
 */

const teeInfo = {
  supported: true,
  attestationType: 'software-attestation',
  description:
    'ACK uses software-based attestation for reputation data integrity verification.',
  verificationEndpoint: 'https://ack-onchain.dev/api/tee/verify',
};

export async function GET() {
  return NextResponse.json(teeInfo, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}
