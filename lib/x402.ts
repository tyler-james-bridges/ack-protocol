import { withX402, x402ResourceServer } from '@x402/next';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import type { Network } from '@x402/core/types';
import { NextRequest, NextResponse } from 'next/server';
import {
  BASE_USDC_ADDRESS,
  USDC_ADDRESS,
  USDC_DECIMALS,
} from '@/config/tokens';
import { DEFAULT_8004_CHAIN_ID } from '@/config/chain';

export const ABSTRACT_FACILITATOR_URL = 'https://facilitator.x402.abs.xyz';
export const BASE_FACILITATOR_URL =
  process.env.BASE_X402_FACILITATOR_URL ||
  process.env.X402_BASE_FACILITATOR_URL ||
  'https://facilitator.openx402.ai';

export const NETWORK: Network = 'eip155:2741';

const DEFAULT_PAY_TO =
  process.env.AGENT_WALLET_ADDRESS ||
  '0x668aDd9213985E7Fd613Aec87767C892f4b9dF1c';

interface X402ChainConfig {
  chainId: number;
  network: Network;
  facilitatorUrl: string;
}

const X402_CHAIN_CONFIGS: Record<number, X402ChainConfig> = {
  2741: {
    chainId: 2741,
    network: 'eip155:2741',
    facilitatorUrl: ABSTRACT_FACILITATOR_URL,
  },
  8453: {
    chainId: 8453,
    network: 'eip155:8453',
    facilitatorUrl: BASE_FACILITATOR_URL,
  },
};

export function getX402ChainConfig(chainId: number = DEFAULT_8004_CHAIN_ID) {
  return (
    X402_CHAIN_CONFIGS[chainId] ?? X402_CHAIN_CONFIGS[DEFAULT_8004_CHAIN_ID]
  );
}

const servers = new Map<number, x402ResourceServer>();

function getServer(
  chainId: number = DEFAULT_8004_CHAIN_ID
): x402ResourceServer {
  const cfg = getX402ChainConfig(chainId);
  const existing = servers.get(cfg.chainId);
  if (existing) return existing;

  {
    const facilitator = new HTTPFacilitatorClient({
      url: cfg.facilitatorUrl,
    });

    const scheme = new ExactEvmScheme();
    scheme.registerMoneyParser(async (amount: number, network: string) => {
      if (network === 'eip155:2741') {
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
      if (network === 'eip155:8453') {
        return {
          amount: Math.round(amount * 1e6).toString(),
          asset: BASE_USDC_ADDRESS,
          extra: {
            name: 'USD Coin',
            version: '2',
            decimals: USDC_DECIMALS,
          },
        };
      }
      return null;
    });

    const server = new x402ResourceServer(facilitator).register(
      'eip155:*' as Network,
      scheme
    );
    servers.set(cfg.chainId, server);
    return server;
  }
}

/**
 * Wraps a Next.js route handler with x402 payment protection.
 */
export function withPayment<T = unknown>(
  handler: (request: NextRequest) => Promise<NextResponse<T>>,
  price: string,
  description: string,
  payTo?: string,
  chainId: number = DEFAULT_8004_CHAIN_ID
) {
  const cfg = getX402ChainConfig(chainId);
  return withX402(
    handler,
    {
      accepts: [
        {
          scheme: 'exact',
          payTo: payTo || DEFAULT_PAY_TO,
          price,
          network: cfg.network,
        },
      ],
      description,
      mimeType: 'application/json',
    },
    getServer(cfg.chainId)
  );
}
