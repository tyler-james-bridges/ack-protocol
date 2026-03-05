import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      status: 'healthy',
      name: 'ACK Protocol',
      version: '1.1.0',
      timestamp: new Date().toISOString(),
      services: {
        web: 'up',
        mcp: 'up',
        a2a: 'up',
        oasf: 'up',
      },
    },
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
