import { withX402, x402ResourceServer } from '@x402/next';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import {
  BUILDER_CODE,
  builderCodeResourceServerExtension,
  declareBuilderCodeExtension,
} from '@x402/extensions/builder-code';
import type { Network } from '@x402/core/types';
import { NextRequest, NextResponse } from 'next/server';
import {
  BASE_USDC_ADDRESS,
  USDC_ADDRESS,
  USDC_DECIMALS,
} from '@/config/tokens';
import { DEFAULT_8004_CHAIN_ID } from '@/config/chain';
import { BASE_BUILDER_CODE } from '@/config/builder-code';

export const ABSTRACT_FACILITATOR_URL = 'https://facilitator.x402.abs.xyz';
/** Settles Base mainnet. `/supported` extensions are `["discovery"]` only. */
export const OPENX402_BASE_FACILITATOR_URL = 'https://facilitator.openx402.ai';
/**
 * CDP facilitator documents builder-code on Base (`eip155:8453`).
 * `GET /supported` returns 401 without CDP API credentials, and this app does
 * not attach those credentials. Do not point the default URL here.
 */
export const CDP_X402_FACILITATOR_URL =
  'https://api.cdp.coinbase.com/platform/v2/x402';

export const BASE_FACILITATOR_URL =
  process.env.BASE_X402_FACILITATOR_URL ||
  process.env.X402_BASE_FACILITATOR_URL ||
  OPENX402_BASE_FACILITATOR_URL;

export const NETWORK: Network = 'eip155:8453';

/**
 * Advertise ERC-8021 builder-code on Base payment requirements only when the
 * configured facilitator is expected to honor it.
 *
 * Checked 2026-09-26:
 * - openx402 (default) settles eip155:8453 and does not list `builder-code`
 * - https://x402.org/facilitator lists `builder-code` but not eip155:8453
 * - CDP lists both, and requires authenticated settle calls
 *
 * Leaving the extension off by default keeps openx402 settlement working.
 * Set BASE_X402_BUILDER_CODE=1 after the facilitator both settles Base and
 * advertises builder-code.
 */
export function facilitatorSupportsBuilderCode(): boolean {
  const flag = process.env.BASE_X402_BUILDER_CODE?.toLowerCase();
  return flag === '1' || flag === 'true' || flag === 'on';
}

export function paymentExtensionsForChain(
  chainId: number
): Record<string, ReturnType<typeof declareBuilderCodeExtension>> | undefined {
  if (chainId !== 8453) return undefined;
  if (!facilitatorSupportsBuilderCode()) return undefined;
  return {
    [BUILDER_CODE]: declareBuilderCodeExtension(BASE_BUILDER_CODE),
  };
}

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
    if (cfg.chainId === 8453 && facilitatorSupportsBuilderCode()) {
      server.registerExtension(builderCodeResourceServerExtension);
    }
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
  const extensions = paymentExtensionsForChain(cfg.chainId);
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
      ...(extensions ? { extensions } : {}),
    },
    getServer(cfg.chainId)
  );
}
