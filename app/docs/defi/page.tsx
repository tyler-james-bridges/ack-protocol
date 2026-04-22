import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DeFi API - ACK Protocol',
  description:
    'DeFi API endpoints for swaps, lending, and prediction markets on Abstract.',
};

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto bg-black p-4 text-sm leading-relaxed text-white/80">
      <code>{children}</code>
    </pre>
  );
}

function Endpoint({
  method,
  path,
  price,
  description,
  params,
}: {
  method: string;
  path: string;
  price: string;
  description: string;
  params?: string;
}) {
  const color =
    method === 'GET'
      ? 'bg-green-500/20 text-black'
      : 'bg-yellow-500/20 text-black';
  return (
    <div className="border-2 border-black bg-white p-5">
      <div className="mb-2 flex items-center gap-3">
        <span className={`px-2 py-0.5 font-mono text-xs font-bold ${color}`}>
          {method}
        </span>
        <code className="text-sm">{path}</code>
        <span className="ml-auto font-mono text-xs text-black/40">{price}</span>
      </div>
      <p className="text-sm text-black/50">{description}</p>
      {params && <p className="mt-1 text-xs text-black/40">{params}</p>}
    </div>
  );
}

function TokenTable() {
  const tokens = [
    { symbol: 'ETH', address: 'Native', decimals: '18' },
    {
      symbol: 'WETH',
      address: '0x3439153eB7AF838Ad19d56E1571FBD09333C2809',
      decimals: '18',
    },
    {
      symbol: 'USDC / USDC.e',
      address: '0x84A71ccD554Cc1b02749b35d22F684CC8ec987e1',
      decimals: '6',
    },
    {
      symbol: 'KONA',
      address: '0x92aba186c85b5afeb3a2cedc8772ae8638f1b565',
      decimals: '18',
    },
  ];

  return (
    <div className="space-y-1">
      {tokens.map((t) => (
        <div
          key={t.symbol}
          className="flex items-center gap-4 border-2 border-black bg-white px-4 py-2 font-mono text-xs"
        >
          <span className="w-24 font-bold">{t.symbol}</span>
          <span className="flex-1 text-black/50">{t.address}</span>
          <span className="text-black/40">{t.decimals}d</span>
        </div>
      ))}
    </div>
  );
}

export default function DefiDocsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <Link
        href="/docs"
        className="mb-6 inline-block text-sm text-black/40 hover:text-black"
      >
        Docs
      </Link>
      <h1 className="mb-4 text-4xl font-bold text-black">DeFi API</h1>
      <p className="mb-10 text-lg text-black/50">
        On-chain DeFi operations on Abstract via ACK&apos;s Abstract Global
        Wallet. Swaps, lending, and prediction markets -- all gated behind x402
        micropayments.
      </p>

      <h2 className="mb-4 text-2xl font-semibold text-black">
        Supported Tokens
      </h2>
      <div className="mb-10">
        <TokenTable />
      </div>

      <h2 className="mb-4 text-2xl font-semibold text-black">Protocols</h2>
      <div className="mb-10 space-y-2">
        <div className="border-2 border-black bg-white p-4">
          <p className="font-bold">Aborean DEX</p>
          <p className="text-sm text-black/50">
            Aerodrome/Velodrome fork on Abstract. Token swaps with configurable
            slippage.
          </p>
        </div>
        <div className="border-2 border-black bg-white p-4">
          <p className="font-bold">Morpho Blue</p>
          <p className="text-sm text-black/50">
            Lending protocol. Supply WETH as collateral, borrow USDC, repay,
            withdraw.
          </p>
        </div>
        <div className="border-2 border-black bg-white p-4">
          <p className="font-bold">Myriad Markets</p>
          <p className="text-sm text-black/50">
            Prediction markets on Abstract. List open markets, get quotes, place
            bets.
          </p>
        </div>
      </div>

      <h2 className="mb-4 text-2xl font-semibold text-black">Endpoints</h2>
      <div className="mb-10 space-y-3">
        <Endpoint
          method="GET"
          path="/api/defi/status"
          price="free"
          description="Returns wallet balances (ETH, WETH, USDC.e, KONA) and Morpho lending positions."
        />
        <Endpoint
          method="POST"
          path="/api/defi/swap"
          price="$0.05"
          description="Execute a token swap via Aborean DEX."
          params='Body: { "from": "ETH", "to": "USDC", "amount": "0.01", "slippagePct": 5 }'
        />
        <Endpoint
          method="POST"
          path="/api/defi/lend"
          price="$0.05"
          description="Morpho Blue lending operation."
          params='Body: { "action": "supply|borrow|repay|withdraw", "amount": "0.01" }'
        />
        <Endpoint
          method="GET"
          path="/api/defi/markets"
          price="free"
          description="List open Myriad prediction markets with outcome prices."
        />
        <Endpoint
          method="POST"
          path="/api/defi/bet"
          price="$0.05"
          description="Place a prediction market bet on Myriad."
          params='Body: { "marketId": "164", "outcomeIndex": 0, "amount": "1" }'
        />
      </div>

      <h2 className="mb-4 text-2xl font-semibold text-black">Payment (x402)</h2>
      <p className="mb-4 text-sm text-black/50">
        POST endpoints require x402 payment in USDC on Abstract (chain 2741).
        GET endpoints are free. See{' '}
        <code className="bg-black px-1 py-0.5 text-white text-xs">
          /api/x402
        </code>{' '}
        for payment requirements.
      </p>

      <h2 className="mb-4 text-2xl font-semibold text-black">Examples</h2>

      <h3 className="mb-2 text-lg font-semibold text-black">
        Get Portfolio Status
      </h3>
      <Code>
        {`curl https://ack-onchain.dev/api/defi/status

// Response:
{
  "address": "0x5c1b285A11267EFb0939Bd6502c53199cF4Df3fa",
  "balances": [
    { "symbol": "ETH", "balance": "0.042", "raw": "42000000000000000" },
    { "symbol": "WETH", "balance": "0.0", "raw": "0" },
    { "symbol": "USDC.e", "balance": "12.5", "raw": "12500000" },
    { "symbol": "KONA", "balance": "1000.0", "raw": "1000000000000000000000" }
  ],
  "positions": [
    {
      "market": "WETH/USDC",
      "supplyShares": "0",
      "borrowShares": "0",
      "collateral": "0.003"
    }
  ]
}`}
      </Code>

      <h3 className="mb-2 mt-6 text-lg font-semibold text-black">
        Swap Tokens
      </h3>
      <Code>
        {`// Swap 0.01 ETH for USDC (requires x402 payment)
curl -X POST https://ack-onchain.dev/api/defi/swap \\
  -H "Content-Type: application/json" \\
  -H "X-PAYMENT: <x402-receipt>" \\
  -d '{"from": "ETH", "to": "USDC", "amount": "0.01"}'

// Response:
{
  "txHash": "0xabc...",
  "from": "ETH",
  "to": "USDC",
  "amountIn": "0.01",
  "expectedOut": "25.123456",
  "minOut": "23.867283"
}`}
      </Code>

      <h3 className="mb-2 mt-6 text-lg font-semibold text-black">
        Lending Operations
      </h3>
      <Code>
        {`// Supply WETH as collateral (wraps ETH automatically)
curl -X POST https://ack-onchain.dev/api/defi/lend \\
  -H "Content-Type: application/json" \\
  -H "X-PAYMENT: <x402-receipt>" \\
  -d '{"action": "supply", "amount": "0.003"}'

// Borrow USDC against collateral
curl -X POST https://ack-onchain.dev/api/defi/lend \\
  -H "Content-Type: application/json" \\
  -H "X-PAYMENT: <x402-receipt>" \\
  -d '{"action": "borrow", "amount": "1.5"}'`}
      </Code>

      <h3 className="mb-2 mt-6 text-lg font-semibold text-black">
        Prediction Markets
      </h3>
      <Code>
        {`// List open markets
curl https://ack-onchain.dev/api/defi/markets

// Place a bet
curl -X POST https://ack-onchain.dev/api/defi/bet \\
  -H "Content-Type: application/json" \\
  -H "X-PAYMENT: <x402-receipt>" \\
  -d '{"marketId": "164", "outcomeIndex": 0, "amount": "1"}'`}
      </Code>

      <div className="mt-12 flex gap-4 text-sm">
        <Link href="/docs/api" className="text-black hover:text-black">
          API Reference
        </Link>
        <Link href="/docs/sdk" className="text-black hover:text-black">
          SDK Reference
        </Link>
      </div>
    </main>
  );
}
