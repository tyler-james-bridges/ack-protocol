import { NextResponse } from 'next/server';
import { buildAckAssemblyManifest } from '@/lib/tools/assembly-manifest';

export async function GET() {
  return NextResponse.json(buildAckAssemblyManifest(), {
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
