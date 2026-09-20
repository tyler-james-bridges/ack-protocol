import { NextResponse } from 'next/server';
import { ackKudosManifest } from '@/lib/tools/kudos-manifest';

export async function GET() {
  return NextResponse.json(ackKudosManifest, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
