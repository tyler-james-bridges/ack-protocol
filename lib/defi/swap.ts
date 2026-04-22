import { parseUnits, formatUnits, type Address } from 'viem';
import { getAgwClient } from './client';
import { getPublicClient } from './client';
import {
  ABOREAN_ROUTER,
  ABOREAN_FACTORY,
  WETH,
  ABOREAN_ROUTER_ABI,
  ERC20_ABI,
  TOKEN_MAP,
} from './constants';

export interface SwapParams {
  from: string;
  to: string;
  amount: string;
  slippagePct?: number;
}

export interface SwapResult {
  txHash: string;
  from: string;
  to: string;
  amountIn: string;
  expectedOut: string;
  minOut: string;
}

/**
 * Validate swap parameters before execution.
 */
export function validateSwapParams(params: SwapParams): string | null {
  const fromKey = params.from.toUpperCase();
  const toKey = params.to.toUpperCase();

  if (!TOKEN_MAP[fromKey]) return `Unknown token: ${params.from}`;
  if (!TOKEN_MAP[toKey]) return `Unknown token: ${params.to}`;
  if (fromKey === toKey) return 'Cannot swap token to itself';

  const amount = parseFloat(params.amount);
  if (isNaN(amount) || amount <= 0) return 'Amount must be a positive number';
  if (params.slippagePct !== undefined) {
    if (params.slippagePct < 0.1 || params.slippagePct > 50)
      return 'Slippage must be between 0.1% and 50%';
  }

  return null;
}

/**
 * Execute a token swap via the Aborean DEX router.
 */
export async function executeSwap(params: SwapParams): Promise<SwapResult> {
  const error = validateSwapParams(params);
  if (error) throw new Error(error);

  const fromKey = params.from.toUpperCase();
  const toKey = params.to.toUpperCase();
  const fromToken = TOKEN_MAP[fromKey];
  const toToken = TOKEN_MAP[toKey];
  const slippage = params.slippagePct ?? 5;

  const swapAmount = parseUnits(params.amount, fromToken.decimals);
  const route = [
    {
      from: fromToken.address,
      to: toToken.address,
      stable: false,
      factory: ABOREAN_FACTORY,
    },
  ];
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);

  const pub = getPublicClient();
  const { agw, address } = await getAgwClient();

  // Get quote
  const amounts = await pub.readContract({
    address: ABOREAN_ROUTER,
    abi: ABOREAN_ROUTER_ABI,
    functionName: 'getAmountsOut',
    args: [swapAmount, route],
  });
  const expectedOut = amounts[amounts.length - 1];
  const minOut =
    (expectedOut * BigInt(Math.floor((100 - slippage) * 100))) / BigInt(10000);

  let txHash: string;

  if (fromKey === 'ETH') {
    txHash = await agw.writeContract({
      address: ABOREAN_ROUTER,
      abi: ABOREAN_ROUTER_ABI,
      functionName: 'swapExactETHForTokens',
      args: [minOut, route, address, deadline],
      value: swapAmount,
    });
  } else {
    // Approve token spend
    await approveIfNeeded(
      agw,
      pub,
      fromToken.address,
      ABOREAN_ROUTER,
      swapAmount,
      address
    );

    const fn =
      toKey === 'ETH' ? 'swapExactTokensForETH' : 'swapExactTokensForTokens';
    txHash = await agw.writeContract({
      address: ABOREAN_ROUTER,
      abi: ABOREAN_ROUTER_ABI,
      functionName: fn,
      args: [swapAmount, minOut, route, address, deadline],
    });
  }

  await pub.waitForTransactionReceipt({ hash: txHash as `0x${string}` });

  return {
    txHash,
    from: fromKey,
    to: toKey,
    amountIn: params.amount,
    expectedOut: formatUnits(expectedOut, toToken.decimals),
    minOut: formatUnits(minOut, toToken.decimals),
  };
}

async function approveIfNeeded(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agw: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pub: any,
  token: Address,
  spender: Address,
  amount: bigint,
  owner: Address
) {
  const allowance = await pub.readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [owner, spender],
  });
  if (allowance < amount) {
    const approveTx = await agw.writeContract({
      address: token,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spender, amount],
    });
    await pub.waitForTransactionReceipt({ hash: approveTx });
  }
}
