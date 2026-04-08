import { formatUnits, formatEther, type Address } from 'viem';
import { getPublicClient } from './client';
import {
  WETH,
  USDC_E,
  KONA,
  MORPHO,
  MARKET_WETH_USDC,
  MARKET_USDC_WETH,
  MARKET_PENGU_USDC,
  ERC20_ABI,
  MORPHO_ABI,
} from './constants';

export interface TokenBalance {
  symbol: string;
  balance: string;
  raw: string;
}

export interface MorphoPosition {
  market: string;
  supplyShares: string;
  borrowShares: string;
  collateral: string;
}

export interface PortfolioStatus {
  address: string;
  balances: TokenBalance[];
  positions: MorphoPosition[];
}

/**
 * Fetch wallet balances and Morpho positions for the given address.
 */
export async function getPortfolioStatus(
  address: Address
): Promise<PortfolioStatus> {
  const pub = getPublicClient();

  const [ethBal, usdcBal, wethBal, konaBal] = await Promise.all([
    pub.getBalance({ address }),
    pub.readContract({
      address: USDC_E,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [address],
    }),
    pub.readContract({
      address: WETH,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [address],
    }),
    pub.readContract({
      address: KONA,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [address],
    }),
  ]);

  const balances: TokenBalance[] = [
    {
      symbol: 'ETH',
      balance: formatEther(ethBal),
      raw: ethBal.toString(),
    },
    {
      symbol: 'WETH',
      balance: formatUnits(wethBal, 18),
      raw: wethBal.toString(),
    },
    {
      symbol: 'USDC.e',
      balance: formatUnits(usdcBal, 6),
      raw: usdcBal.toString(),
    },
    {
      symbol: 'KONA',
      balance: formatUnits(konaBal, 18),
      raw: konaBal.toString(),
    },
  ];

  const markets = [
    { name: 'WETH/USDC', id: MARKET_WETH_USDC },
    { name: 'USDC/WETH', id: MARKET_USDC_WETH },
    { name: 'PENGU/USDC', id: MARKET_PENGU_USDC },
  ] as const;

  const positions: MorphoPosition[] = [];

  for (const market of markets) {
    try {
      const pos = await pub.readContract({
        address: MORPHO,
        abi: MORPHO_ABI,
        functionName: 'position',
        args: [market.id, address],
      });
      const [supplyShares, borrowShares, collateral] = pos;
      if (
        supplyShares > BigInt(0) ||
        borrowShares > BigInt(0) ||
        collateral > BigInt(0)
      ) {
        positions.push({
          market: market.name,
          supplyShares: supplyShares.toString(),
          borrowShares: borrowShares.toString(),
          collateral: formatUnits(collateral, 18),
        });
      }
    } catch {
      // market may not exist or be accessible
    }
  }

  return { address, balances, positions };
}
