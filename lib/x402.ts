import { withX402, x402ResourceServer } from '@x402/next';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import type { Network } from '@x402/core/types';
import { NextRequest, NextResponse } from 'next/server';
import { USDC_ADDRESS, USDC_DECIMALS } from '@/config/tokens';

export const ABSTRACT_FACILITATOR_URL = 'https://facilitator.x402.abs.xyz';
export const NETWORK: Network = 'eip155:2741';

const DEFAULT_PAY_TO =
  process.env.AGENT_WALLET_ADDRESS ||
  '0x668aDd9213985E7Fd613Aec87767C892f4b9dF1c';

let _server: x402ResourceServer | null = null;

function getServer(): x402ResourceServer {
  if (!_server) {
    const facilitator = new HTTPFacilitatorClient({
      url: ABSTRACT_FACILITATOR_URL,
    });

    const scheme = new ExactEvmScheme();
    scheme.registerMoneyParser(async (amount: number, network: string) => {
      if (network === NETWORK) {
        return {
          amount: Math.round(amount * 1e6).toString(),
          asset: USDC_ADDRESS,
          extra: {
            name: 'Bridged USDC (Stargate)',
            version: '2',
            decimals: USDC_DECIMALS,
          },
        };
      }
      return null;
    });

    _server = new x402ResourceServer(facilitator).register(
      'eip155:*' as Network,
      scheme
    );
  }
  return _server;
}

/**
 * Wraps a Next.js route handler with x402 payment protection.
 */
export function withPayment<T = unknown>(
  handler: (request: NextRequest) => Promise<NextResponse<T>>,
  price: string,
  description: string,
  payTo?: string
) {
  return withX402(
    handler,
    {
      accepts: [
        {
          scheme: 'exact',
          payTo: payTo || DEFAULT_PAY_TO,
          price,
          network: NETWORK,
        },
      ],
      description,
      mimeType: 'application/json',
    },
    getServer()
  );
}
