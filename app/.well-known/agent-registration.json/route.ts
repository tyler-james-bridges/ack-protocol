import { NextResponse } from 'next/server';

/**
 * ERC-8004 endpoint domain verification.
 * Proves this domain is controlled by agent #606's owner.
 */
export function GET() {
  return NextResponse.json({
    registrations: [
      {
        agentId: 606,
        agentRegistry: 'eip155:2741:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
      },
      {
        agentId: 26424,
        agentRegistry: 'eip155:1:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
      },
    ],
  });
}
