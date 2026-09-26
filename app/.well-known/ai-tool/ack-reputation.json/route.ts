import { NextResponse } from 'next/server';
import { buildAckReputationManifest } from '@/lib/tool-manifest';

export async function GET() {
  return NextResponse.json(buildAckReputationManifest(), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
