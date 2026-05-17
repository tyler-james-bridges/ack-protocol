import { getAddress, type Address } from 'viem';

// -- Tokens --
export const WETH: Address = getAddress(
  '0x3439153eB7AF838Ad19d56E1571FBD09333C2809'
);
export const USDC_E: Address = getAddress(
  '0x84A71ccD554Cc1b02749b35d22F684CC8ec987e1'
);
export const KONA: Address = getAddress(
  '0x92aba186c85b5afeb3a2cedc8772ae8638f1b565'
);

// -- Aborean DEX (Aerodrome/Velodrome fork) --
export const ABOREAN_ROUTER: Address = getAddress(
  '0xE8142D2f82036B6FC1e79E4aE85cF53FBFfDC998'
);
export const ABOREAN_FACTORY: Address = getAddress(
  '0xF6cDfFf7Ad51caaD860e7A35d6D4075d74039a6B'
);

// -- Morpho Blue (lending) --
export const MORPHO: Address = getAddress(
  '0xc85CE8ffdA27b646D269516B8d0Fa6ec2E958B55'
);

export const MARKET_WETH_USDC =
  '0xe96cd1bdfb81a74b15e39ac2b024cd02c71f7ddf5cbb7ca8e7c42861b665d8c1' as const;
export const MARKET_USDC_WETH =
  '0xe58eb6d5dfb817dd44d6a9b3dcfe54bd873861ac7a1dbd078cc8e61c187feea2' as const;
export const MARKET_PENGU_USDC =
  '0x5e54802ce0e3ec0ecaa57a0f107b949fcd91ebf7dd131704264575656599d087' as const;

// -- Myriad Markets --
export const MYRIAD_PM: Address = getAddress(
  '0x3e0F5F8F5Fb043aBFA475C0308417Bf72c463289'
);
export const MYRIAD_QUERIER: Address = getAddress(
  '0x1d5773Cd0dC74744C1F7a19afEeECfFE64f233Ff'
);

// -- ACK Wallet --
export const AGW_ADDRESS: Address = getAddress(
  '0x5c1b285A11267EFb0939Bd6502c53199cF4Df3fa'
);
export const EOA_SIGNER: Address = getAddress(
  '0x668aDd9213985E7Fd613Aec87767C892f4b9dF1c'
);

export const RPC_URL = 'https://api.mainnet.abs.xyz';
export const ABSTRACT_CHAIN_ID = 2741;

// -- Token metadata --
export const TOKEN_MAP: Record<string, { address: Address; decimals: number }> =
  {
    ETH: { address: WETH, decimals: 18 },
    WETH: { address: WETH, decimals: 18 },
    USDC: { address: USDC_E, decimals: 6 },
    'USDC.e': { address: USDC_E, decimals: 6 },
    KONA: { address: KONA, decimals: 18 },
  };

// -- ABIs --
export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
] as const;

export const WETH_ABI = [
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'payable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'wad', type: 'uint256' }],
    outputs: [],
  },
] as const;

export const ABOREAN_ROUTER_ABI = [
  {
    name: 'getAmountsOut',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      {
        name: 'routes',
        type: 'tuple[]',
        components: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'stable', type: 'bool' },
          { name: 'factory', type: 'address' },
        ],
      },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    name: 'swapExactTokensForETH',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      {
        name: 'routes',
        type: 'tuple[]',
        components: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'stable', type: 'bool' },
          { name: 'factory', type: 'address' },
        ],
      },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    name: 'swapExactETHForTokens',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'amountOutMin', type: 'uint256' },
      {
        name: 'routes',
        type: 'tuple[]',
        components: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'stable', type: 'bool' },
          { name: 'factory', type: 'address' },
        ],
      },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    name: 'swapExactTokensForTokens',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      {
        name: 'routes',
        type: 'tuple[]',
        components: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'stable', type: 'bool' },
          { name: 'factory', type: 'address' },
        ],
      },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
] as const;

export const MORPHO_ABI = [
  {
    name: 'supply',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'marketParams',
        type: 'tuple',
        components: [
          { name: 'loanToken', type: 'address' },
          { name: 'collateralToken', type: 'address' },
          { name: 'oracle', type: 'address' },
          { name: 'irm', type: 'address' },
          { name: 'lltv', type: 'uint256' },
        ],
      },
      { name: 'assets', type: 'uint256' },
      { name: 'shares', type: 'uint256' },
      { name: 'onBehalf', type: 'address' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [{ type: 'uint256' }, { type: 'uint256' }],
  },
  {
    name: 'supplyCollateral',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'marketParams',
        type: 'tuple',
        components: [
          { name: 'loanToken', type: 'address' },
          { name: 'collateralToken', type: 'address' },
          { name: 'oracle', type: 'address' },
          { name: 'irm', type: 'address' },
          { name: 'lltv', type: 'uint256' },
        ],
      },
      { name: 'assets', type: 'uint256' },
      { name: 'onBehalf', type: 'address' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    name: 'borrow',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'marketParams',
        type: 'tuple',
        components: [
          { name: 'loanToken', type: 'address' },
          { name: 'collateralToken', type: 'address' },
          { name: 'oracle', type: 'address' },
          { name: 'irm', type: 'address' },
          { name: 'lltv', type: 'uint256' },
        ],
      },
      { name: 'assets', type: 'uint256' },
      { name: 'shares', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'onBehalf', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }, { type: 'uint256' }],
  },
  {
    name: 'repay',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'marketParams',
        type: 'tuple',
        components: [
          { name: 'loanToken', type: 'address' },
          { name: 'collateralToken', type: 'address' },
          { name: 'oracle', type: 'address' },
          { name: 'irm', type: 'address' },
          { name: 'lltv', type: 'uint256' },
        ],
      },
      { name: 'assets', type: 'uint256' },
      { name: 'shares', type: 'uint256' },
      { name: 'onBehalf', type: 'address' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [{ type: 'uint256' }, { type: 'uint256' }],
  },
  {
    name: 'withdrawCollateral',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'marketParams',
        type: 'tuple',
        components: [
          { name: 'loanToken', type: 'address' },
          { name: 'collateralToken', type: 'address' },
          { name: 'oracle', type: 'address' },
          { name: 'irm', type: 'address' },
          { name: 'lltv', type: 'uint256' },
        ],
      },
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'onBehalf', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'idToMarketParams',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'bytes32' }],
    outputs: [
      { name: 'loanToken', type: 'address' },
      { name: 'collateralToken', type: 'address' },
      { name: 'oracle', type: 'address' },
      { name: 'irm', type: 'address' },
      { name: 'lltv', type: 'uint256' },
    ],
  },
  {
    name: 'position',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'id', type: 'bytes32' },
      { name: 'user', type: 'address' },
    ],
    outputs: [
      { name: 'supplyShares', type: 'uint256' },
      { name: 'borrowShares', type: 'uint128' },
      { name: 'collateral', type: 'uint128' },
    ],
  },
] as const;

export const MYRIAD_PM_ABI = [
  {
    name: 'getMarkets',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    name: 'getMarketData',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'marketId', type: 'uint256' }],
    outputs: [
      { name: 'state', type: 'uint8' },
      { name: 'closesAt', type: 'uint256' },
      { name: 'liquidity', type: 'uint256' },
      { name: 'balance', type: 'uint256' },
      { name: 'sharesAvailable', type: 'uint256' },
      { name: 'resolvedOutcomeId', type: 'int256' },
    ],
  },
  {
    name: 'getMarketAltData',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'marketId', type: 'uint256' }],
    outputs: [
      { name: 'token', type: 'address' },
      { name: 'treasury', type: 'address' },
      { name: 'realitio', type: 'address' },
      { name: 'timeout', type: 'uint256' },
    ],
  },
  {
    name: 'getMarketOutcomeIds',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'marketId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    name: 'getMarketOutcomeData',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'outcomeId', type: 'uint256' },
    ],
    outputs: [
      { name: 'price', type: 'uint256' },
      { name: 'sharesAvailable', type: 'uint256' },
      { name: 'totalShares', type: 'uint256' },
    ],
  },
  {
    name: 'getMarketPrices',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'marketId', type: 'uint256' }],
    outputs: [
      { name: 'liquidityPrice', type: 'uint256' },
      { name: 'outcomePrices', type: 'uint256[]' },
    ],
  },
  {
    name: 'calcBuyAmount',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'marketId', type: 'uint256' },
      { name: 'outcomeId', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'buy',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'outcomeId', type: 'uint256' },
      { name: 'minOutcomeSharesToBuy', type: 'uint256' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;
