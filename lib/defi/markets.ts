import { formatUnits, parseUnits, type Address } from 'viem';
import { getAgwClient, getPublicClient } from './client';
import { MYRIAD_PM, MYRIAD_PM_ABI, ERC20_ABI, USDC_E } from './constants';

export interface MarketOutcome {
  index: number;
  name: string;
  price: string;
  pricePct: string;
}

export interface Market {
  id: string;
  state: string;
  closesAt: string;
  liquidity: string;
  token: string;
  outcomes: MarketOutcome[];
}

export interface BetParams {
  marketId: string;
  outcomeIndex: number;
  amount: string;
}

export interface BetResult {
  txHash: string;
  marketId: string;
  outcomeIndex: number;
  amount: string;
  sharesReceived: string;
}

const STATE_NAMES = ['open', 'closed', 'resolved'] as const;

function formatPrice(raw: bigint): string {
  return `${(Number(raw) / 1e16).toFixed(1)}%`;
}

/**
 * Validate bet parameters.
 */
export function validateBetParams(params: BetParams): string | null {
  const marketId = parseInt(params.marketId, 10);
  if (isNaN(marketId) || marketId < 0)
    return 'marketId must be a non-negative integer';

  if (params.outcomeIndex < 0 || params.outcomeIndex > 10)
    return 'outcomeIndex must be between 0 and 10';

  const amount = parseFloat(params.amount);
  if (isNaN(amount) || amount <= 0) return 'amount must be a positive number';

  return null;
}

/**
 * List open prediction markets from Myriad on Abstract.
 */
export async function listMarkets(): Promise<Market[]> {
  const pub = getPublicClient();

  const allIds = await pub.readContract({
    address: MYRIAD_PM,
    abi: MYRIAD_PM_ABI,
    functionName: 'getMarkets',
  });

  if (!allIds.length) return [];

  // Check last 50 markets for open ones
  const checkIds = allIds.slice(-50);

  const dataResults = await pub.multicall({
    contracts: checkIds.map((id) => ({
      address: MYRIAD_PM,
      abi: MYRIAD_PM_ABI,
      functionName: 'getMarketData' as const,
      args: [id],
    })),
  });

  const openIds = checkIds.filter((_id, i) => {
    const r = dataResults[i];
    return (
      r.status === 'success' && Array.isArray(r.result) && r.result[0] === 0
    );
  });

  if (!openIds.length) return [];

  const [priceResults, altResults] = await Promise.all([
    pub.multicall({
      contracts: openIds.map((id) => ({
        address: MYRIAD_PM,
        abi: MYRIAD_PM_ABI,
        functionName: 'getMarketPrices' as const,
        args: [id],
      })),
    }),
    pub.multicall({
      contracts: openIds.map((id) => ({
        address: MYRIAD_PM,
        abi: MYRIAD_PM_ABI,
        functionName: 'getMarketAltData' as const,
        args: [id],
      })),
    }),
  ]);

  const markets: Market[] = [];

  for (let i = 0; i < openIds.length; i++) {
    const id = openIds[i];
    const dataIdx = checkIds.indexOf(id);
    const dataR = dataResults[dataIdx];
    const priceR = priceResults[i];
    const altR = altResults[i];

    if (dataR.status !== 'success' || !Array.isArray(dataR.result)) continue;

    const [state, closesAt, liquidity] = dataR.result as [
      number,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
    ];

    let tokenSymbol = 'USDC.e';
    if (altR.status === 'success' && Array.isArray(altR.result)) {
      try {
        const sym = await pub.readContract({
          address: altR.result[0] as Address,
          abi: ERC20_ABI,
          functionName: 'symbol',
        });
        tokenSymbol = sym;
      } catch {
        // keep default
      }
    }

    const outcomes: MarketOutcome[] = [];
    if (priceR.status === 'success' && Array.isArray(priceR.result)) {
      const outcomePrices = priceR.result[1] as bigint[];
      for (let j = 0; j < outcomePrices.length; j++) {
        outcomes.push({
          index: j,
          name: j === 0 ? 'Yes' : 'No',
          price: outcomePrices[j].toString(),
          pricePct: formatPrice(outcomePrices[j]),
        });
      }
    }

    markets.push({
      id: id.toString(),
      state: STATE_NAMES[state] ?? 'unknown',
      closesAt: new Date(Number(closesAt) * 1000).toISOString(),
      liquidity: formatUnits(liquidity, 6),
      token: tokenSymbol,
      outcomes,
    });
  }

  return markets;
}

/**
 * Place a prediction market bet on Myriad.
 */
export async function placeBet(params: BetParams): Promise<BetResult> {
  const error = validateBetParams(params);
  if (error) throw new Error(error);

  const pub = getPublicClient();
  const { agw, address } = await getAgwClient();

  const mid = BigInt(params.marketId);
  const oid = BigInt(params.outcomeIndex);

  // Verify market is open
  const marketData = await pub.readContract({
    address: MYRIAD_PM,
    abi: MYRIAD_PM_ABI,
    functionName: 'getMarketData',
    args: [mid],
  });

  if (marketData[0] !== 0) {
    throw new Error(
      `Market ${params.marketId} is not open (state: ${STATE_NAMES[marketData[0]] ?? marketData[0]})`
    );
  }

  // Get token info
  const altData = await pub.readContract({
    address: MYRIAD_PM,
    abi: MYRIAD_PM_ABI,
    functionName: 'getMarketAltData',
    args: [mid],
  });
  const tokenAddr = altData[0] as Address;

  const decimals = await pub.readContract({
    address: tokenAddr,
    abi: ERC20_ABI,
    functionName: 'decimals',
  });

  const valueRaw = parseUnits(params.amount, decimals);

  // Get min shares (1% slippage)
  const minSharesExact = await pub.readContract({
    address: MYRIAD_PM,
    abi: MYRIAD_PM_ABI,
    functionName: 'calcBuyAmount',
    args: [valueRaw, mid, oid],
  });
  const minShares = (minSharesExact * BigInt(99)) / BigInt(100);

  // Approve if needed
  const allowance = await pub.readContract({
    address: tokenAddr,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address, MYRIAD_PM],
  });

  if (allowance < valueRaw) {
    const approveAmount = parseUnits('10000', decimals);
    const approveTx = await agw.writeContract({
      address: tokenAddr,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [MYRIAD_PM, approveAmount],
    });
    await pub.waitForTransactionReceipt({ hash: approveTx });
  }

  // Place bet
  const txHash = await agw.writeContract({
    address: MYRIAD_PM,
    abi: MYRIAD_PM_ABI,
    functionName: 'buy',
    args: [mid, oid, minShares, valueRaw],
  });

  const receipt = await pub.waitForTransactionReceipt({
    hash: txHash as `0x${string}`,
  });

  if (receipt.status === 'reverted') {
    throw new Error(`Transaction reverted: ${txHash}`);
  }

  return {
    txHash,
    marketId: params.marketId,
    outcomeIndex: params.outcomeIndex,
    amount: params.amount,
    sharesReceived: formatUnits(minSharesExact, 18),
  };
}
