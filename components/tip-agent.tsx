'use client';

import { useState, useEffect } from 'react';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useWalletClient,
} from 'wagmi';
import { parseUnits, type Hex, publicActions } from 'viem';
import { abstract } from 'viem/chains';
import { Button } from '@/components/ui/button';
import {
  USDC_ADDRESS,
  ERC20_TRANSFER_ABI,
  USDC_DECIMALS,
  PENGU_ADDRESS,
  PENGU_DECIMALS,
} from '@/config/tokens';
import { cn } from '@/lib/utils';
import type { Address } from 'viem';

const TIP_PRESETS = [1, 2, 5, 10] as const;

type TipToken = 'USDC' | 'PENGU';

const TOKEN_CONFIG: Record<
  TipToken,
  { address: Address; decimals: number; label: string }
> = {
  USDC: { address: USDC_ADDRESS, decimals: USDC_DECIMALS, label: 'USDC' },
  PENGU: { address: PENGU_ADDRESS, decimals: PENGU_DECIMALS, label: 'PENGU' },
};

interface TipAgentProps {
  agentName: string;
  agentTokenId: string;
  ownerAddress: string;
  className?: string;
}

export function TipAgent({
  agentName,
  agentTokenId,
  ownerAddress,
  className,
}: TipAgentProps) {
  const { openConnectModal } = useConnectModal();
  const { address, isConnected, status: accountStatus } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [amount, setAmount] = useState<number | null>(null);
  const [custom, setCustom] = useState('');
  const [token, setToken] = useState<TipToken>('USDC');
  const [status, setStatus] = useState<
    'idle' | 'sending' | 'success' | 'error'
  >('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completedTxHash, setCompletedTxHash] = useState<string | null>(null);

  const isSelf =
    address &&
    ownerAddress &&
    address.toLowerCase() === ownerAddress.toLowerCase();

  const { writeContract, data: txHash, reset } = useWriteContract();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: abstract.id,
  });

  useEffect(() => {
    if (txConfirmed && status === 'sending') setStatus('success');
  }, [txConfirmed, status]);

  async function handleSend() {
    if (!amount || !address || !ownerAddress) return;
    setStatus('sending');
    setErrorMsg(null);

    // USDC tips go through x402 facilitator
    if (token === 'USDC') {
      try {
        // 1. Create tip record
        const tipRes = await fetch('/api/tips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: Number(agentTokenId),
            fromAddress: address,
            amountUsd: amount,
          }),
        });
        if (!tipRes.ok) {
          const err = await tipRes.json().catch(() => ({}));
          throw new Error(
            (err as Record<string, string>).error || 'Failed to create tip'
          );
        }
        const { tipId } = await tipRes.json();

        // 2. Pay via x402 facilitator
        if (!walletClient) throw new Error('Wallet not connected');
        const { wrapFetchWithPaymentFromConfig } = await import('@x402/fetch');
        const { ExactEvmScheme } = await import('@x402/evm/exact/client');

        const extended = walletClient.extend(publicActions);
        const signer = {
          address: address as `0x${string}`,
          signTypedData: (msg: Record<string, unknown>) =>
            extended.signTypedData(
              msg as Parameters<typeof extended.signTypedData>[0]
            ),
          readContract: (args: Record<string, unknown>) =>
            extended.readContract(
              args as Parameters<typeof extended.readContract>[0]
            ),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const scheme = new ExactEvmScheme(signer as any);
        const paidFetch = wrapFetchWithPaymentFromConfig(fetch, {
          schemes: [{ network: 'eip155:2741', client: scheme }],
        });

        const res = await paidFetch(`/api/tips/${tipId}/pay`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as Record<string, string>).error ||
              `Payment failed (${res.status})`
          );
        }

        setStatus('success');
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'x402 payment failed');
        setStatus('error');
      }
      return;
    }

    // PENGU tips use direct transfer (no x402 support)
    const cfg = TOKEN_CONFIG[token];
    const rawAmount = parseUnits(amount.toFixed(cfg.decimals), cfg.decimals);
    writeContract(
      {
        address: cfg.address,
        abi: ERC20_TRANSFER_ABI,
        functionName: 'transfer',
        args: [ownerAddress as Hex, rawAmount],
        chainId: abstract.id,
      },
      {
        onError: (err) => {
          setErrorMsg(
            err instanceof Error ? err.message : 'Transaction rejected'
          );
          setStatus('error');
        },
      }
    );
  }

  function handleReset() {
    reset();
    setAmount(null);
    setCustom('');
    setToken('USDC');
    setStatus('idle');
    setErrorMsg(null);
    setCompletedTxHash(null);
  }

  if (status === 'success') {
    const amountLabel = token === 'USDC' ? `$${amount}` : `${amount} PENGU`;
    const shareText = `Just tipped ${agentName} ${amountLabel} ${token} on @ack_onchain\n\nhttps://ack-onchain.dev/agent/2741/${agentTokenId}`;
    const shareUrl = `https://x.com/intent/post?text=${encodeURIComponent(shareText)}`;

    return (
      <div
        className={cn(
          'rounded-xl border border-[#00FF94]/30 bg-[#00FF94]/5 p-5 text-center space-y-3',
          className
        )}
      >
        <p className="text-2xl">&#10003;</p>
        <p className="font-semibold text-[#00FF94]">
          {amountLabel} {token} sent to {agentName}!
        </p>
        <div className="flex items-center justify-center gap-3">
          {txHash && (
            <a
              href={`https://abscan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              View transaction ↗
            </a>
          )}
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary hover:bg-primary/20 transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Share
          </a>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          Send Another
        </Button>
      </div>
    );
  }

  if (accountStatus === 'reconnecting') {
    return (
      <div
        className={cn(
          'rounded-xl border border-[#00FF94]/20 bg-[#00FF94]/[0.02] p-5',
          className
        )}
      >
        <p className="text-sm text-muted-foreground text-center">
          Reconnecting wallet...
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-[#00FF94]/20 bg-[#00FF94]/[0.02] p-5 space-y-4',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <svg
          className="h-5 w-5 text-[#00FF94]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="font-semibold text-sm">Tip with {token}</p>
        <span className="text-[10px] text-[#00FF94]/60 font-medium uppercase tracking-wider">
          x402
        </span>
      </div>

      {/* Token toggle */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {(['USDC', 'PENGU'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setToken(t);
              setAmount(null);
              setCustom('');
            }}
            className={cn(
              'px-3 py-1 text-xs rounded-md transition-colors font-medium',
              token === t
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Send {token} directly to {agentName}&apos;s owner wallet. Settled
        onchain via x402.
      </p>

      {/* Amount presets + custom input */}
      <div className="flex gap-2">
        {TIP_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => {
              setAmount(amount === preset ? null : preset);
              setCustom('');
            }}
            className={cn(
              'flex-1 py-2 rounded-lg text-sm font-semibold border transition-all',
              amount === preset && !custom
                ? 'border-[#00FF94] bg-[#00FF94]/10 text-[#00FF94] scale-[1.02]'
                : 'border-border text-muted-foreground hover:border-[#00FF94]/40 hover:text-foreground'
            )}
          >
            {token === 'USDC' ? `$${preset}` : preset}
          </button>
        ))}
      </div>
      <div className="relative">
        {token === 'USDC' && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
        )}
        <input
          type="number"
          min="0.01"
          step="0.01"
          placeholder="Custom amount"
          value={custom}
          onChange={(e) => {
            setCustom(e.target.value);
            const val = parseFloat(e.target.value);
            setAmount(val > 0 ? val : null);
          }}
          className={cn(
            'w-full rounded-lg border bg-background py-2 pr-16 text-sm',
            token === 'USDC' ? 'pl-7' : 'pl-3',
            'placeholder:text-muted-foreground/50',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF94]/50',
            custom ? 'border-[#00FF94]/50' : 'border-border'
          )}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {token}
        </span>
      </div>

      {/* Send button */}
      {isSelf ? (
        <p className="text-xs text-muted-foreground text-center">
          You own this agent.
        </p>
      ) : !isConnected ? (
        <Button
          className="w-full bg-[#00FF94] text-black hover:bg-[#00DE73] font-semibold"
          onClick={() => openConnectModal?.()}
        >
          Connect to Tip
        </Button>
      ) : (
        <Button
          className="w-full bg-[#00FF94] text-black hover:bg-[#00DE73] font-semibold"
          disabled={!amount || status === 'sending'}
          onClick={handleSend}
        >
          {status === 'sending'
            ? token === 'USDC'
              ? 'Processing x402 payment...'
              : 'Confirm in wallet...'
            : amount
              ? token === 'USDC'
                ? `Send $${amount} via x402`
                : `Send ${amount} ${token}`
              : 'Select an amount'}
        </Button>
      )}

      {status === 'error' && errorMsg && (
        <p className="text-xs text-destructive text-center">
          {errorMsg.slice(0, 150)}
        </p>
      )}
    </div>
  );
}
