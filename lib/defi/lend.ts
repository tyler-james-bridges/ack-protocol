import { parseUnits, parseEther, type Address } from 'viem';
import { getAgwClient, getPublicClient } from './client';
import {
  MORPHO,
  WETH,
  USDC_E,
  MARKET_WETH_USDC,
  MORPHO_ABI,
  ERC20_ABI,
  WETH_ABI,
} from './constants';

export type LendAction = 'supply' | 'borrow' | 'repay' | 'withdraw';

export interface LendParams {
  action: LendAction;
  amount: string;
}

export interface LendResult {
  txHash: string;
  action: LendAction;
  amount: string;
}

interface MarketParams {
  loanToken: Address;
  collateralToken: Address;
  oracle: Address;
  irm: Address;
  lltv: bigint;
}

const VALID_ACTIONS: LendAction[] = ['supply', 'borrow', 'repay', 'withdraw'];

/**
 * Validate lending parameters.
 */
export function validateLendParams(params: LendParams): string | null {
  if (!VALID_ACTIONS.includes(params.action))
    return `Invalid action: ${params.action}. Must be one of: ${VALID_ACTIONS.join(', ')}`;

  const amount = parseFloat(params.amount);
  if (isNaN(amount) || amount <= 0) return 'Amount must be a positive number';

  return null;
}

async function getMarketParams(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pub: any
): Promise<MarketParams> {
  const params = await pub.readContract({
    address: MORPHO,
    abi: MORPHO_ABI,
    functionName: 'idToMarketParams',
    args: [MARKET_WETH_USDC],
  });
  return {
    loanToken: params[0],
    collateralToken: params[1],
    oracle: params[2],
    irm: params[3],
    lltv: params[4],
  };
}

/**
 * Execute a Morpho Blue lending operation.
 *
 * - supply: Wrap ETH to WETH and supply as collateral
 * - borrow: Borrow USDC against existing collateral
 * - repay: Repay USDC loan
 * - withdraw: Withdraw WETH collateral
 */
export async function executeLend(params: LendParams): Promise<LendResult> {
  const error = validateLendParams(params);
  if (error) throw new Error(error);

  const pub = getPublicClient();
  const { agw, address } = await getAgwClient();
  const marketParams = await getMarketParams(pub);

  let txHash: string;

  switch (params.action) {
    case 'supply': {
      const wethAmount = parseEther(params.amount);

      // Wrap ETH to WETH
      const wrapTx = await agw.writeContract({
        address: WETH,
        abi: WETH_ABI,
        functionName: 'deposit',
        value: wethAmount,
      });
      await pub.waitForTransactionReceipt({ hash: wrapTx });

      // Approve WETH for Morpho
      const approveTx = await agw.writeContract({
        address: WETH,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [MORPHO, wethAmount],
      });
      await pub.waitForTransactionReceipt({ hash: approveTx });

      // Supply collateral
      txHash = await agw.writeContract({
        address: MORPHO,
        abi: MORPHO_ABI,
        functionName: 'supplyCollateral',
        args: [marketParams, wethAmount, address, '0x'],
      });
      await pub.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
      break;
    }

    case 'borrow': {
      const usdcAmount = parseUnits(params.amount, 6);
      txHash = await agw.writeContract({
        address: MORPHO,
        abi: MORPHO_ABI,
        functionName: 'borrow',
        args: [marketParams, usdcAmount, BigInt(0), address, address],
      });
      await pub.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
      break;
    }

    case 'repay': {
      const usdcAmount = parseUnits(params.amount, 6);

      // Approve USDC for Morpho
      const approveTx = await agw.writeContract({
        address: USDC_E,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [MORPHO, usdcAmount],
      });
      await pub.waitForTransactionReceipt({ hash: approveTx });

      txHash = await agw.writeContract({
        address: MORPHO,
        abi: MORPHO_ABI,
        functionName: 'repay',
        args: [marketParams, usdcAmount, BigInt(0), address, '0x'],
      });
      await pub.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
      break;
    }

    case 'withdraw': {
      const wethAmount = parseEther(params.amount);
      txHash = await agw.writeContract({
        address: MORPHO,
        abi: MORPHO_ABI,
        functionName: 'withdrawCollateral',
        args: [marketParams, wethAmount, address, address],
      });
      await pub.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
      break;
    }
  }

  return {
    txHash,
    action: params.action,
    amount: params.amount,
  };
}
