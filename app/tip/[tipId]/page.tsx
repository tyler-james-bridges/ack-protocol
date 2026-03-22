'use client';

import { use, useCallback, useEffect, useState } from 'react';
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useWalletClient,
} from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { parseUnits, type Hex, publicActions } from 'viem';
import { abstract } from 'viem/chains';
import { Nav } from '@/components/nav';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Button } from '@/components/ui/button';
import { AgentAvatar } from '@/components/agent-avatar';
import { PaymentMethodSelector } from '@/components/payment-method-selector';
import {
  USDC_ADDRESS,
  ERC20_TRANSFER_ABI,
  USDC_DECIMALS,
} from '@/config/tokens';
import {
  fetchPaymentMethods,
  type PaymentMethod,
  type PaymentMethodId,
} from '@/lib/payments/discovery';
import {
  trackPaymentEvent,
  createPaymentTimer,
} from '@/lib/payments/telemetry';
import { mapMppError } from '@/lib/payments/mpp-errors';
import { checkMppPreflight } from '@/lib/payments/mpp-preflight';

interface TipData {
  id: string;
  agentName: string;
  agentImageUrl: string | null;
  agentTokenId: string;
  agentChainId: number;
  amountUsd: number;
  message: string | null;
  status: 'pending' | 'completed' | 'expired';
  kudosTxHash: string;
  toAddress: string;
}

type PageStatus =
  | 'loading'
  | 'ready'
  | 'sending'
  | 'verifying'
  | 'success'
  | 'error'
  | 'paying';

export default function TipPage({
  params,
}: {
  params: Promise<{ tipId: string }>;
}) {
  const { tipId } = use(params);
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { openConnectModal } = useConnectModal();

  const [tip, setTip] = useState<TipData | null>(null);
  const [pageStatus, setPageStatus] = useState<PageStatus>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId>('x402');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [mppUnavailableReason, setMppUnavailableReason] = useState<
    string | undefined
  >(undefined);

  const { writeContract, data: txHash, reset: resetWrite } = useWriteContract();

  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: abstract.id,
  });

  // Fetch tip data + payment methods on mount
  useEffect(() => {
    Promise.all([
      fetch(`/api/tips/${tipId}`)
        .then((res) => {
          if (!res.ok) throw new Error('Tip not found');
          return res.json();
        })
        .then((data: { tip: TipData }) => data.tip),
      fetchPaymentMethods(),
    ])
      .then(([tipData, methodsData]) => {
        setTip(tipData);
        setPaymentMethods(methodsData.methods);
        setSelectedMethod(methodsData.defaultMethod);
        setPageStatus(tipData.status === 'completed' ? 'success' : 'ready');
      })
      .catch((err) => {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to load tip');
        setPageStatus('error');
      });
  }, [tipId]);

  // MPP preflight: check when wallet connects and MPP is in the method list
  useEffect(() => {
    const hasMpp = paymentMethods.some((m) => m.id === 'mpp');
    if (!hasMpp || !walletClient) {
      setMppUnavailableReason(undefined);
      return;
    }

    let cancelled = false;
    checkMppPreflight(walletClient).then((result) => {
      if (cancelled) return;
      if (!result.viable) {
        setMppUnavailableReason(result.reason);
        // If MPP was selected, fall back to x402
        setSelectedMethod((prev) => (prev === 'mpp' ? 'x402' : prev));
      } else {
        setMppUnavailableReason(undefined);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [walletClient, paymentMethods]);

  // When direct-transfer tx confirms onchain, verify with the backend
  useEffect(() => {
    if (!txConfirmed || !txHash || pageStatus !== 'sending') return;

    setPageStatus('verifying');

    fetch(`/api/tips/${tipId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txHash }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((b: { error?: string }) => {
            throw new Error(b.error || 'Verification failed');
          });
        }
        return res.json();
      })
      .then(() => {
        trackPaymentEvent('payment_succeeded', {
          method: 'direct',
          tipId,
          amountUsd: tip?.amountUsd,
        });
        setPageStatus('success');
      })
      .catch((err) => {
        trackPaymentEvent('payment_failed', {
          method: 'direct',
          tipId,
          error: err instanceof Error ? err.message : 'Verification failed',
        });
        setErrorMsg(err instanceof Error ? err.message : 'Verification failed');
        setPageStatus('error');
      });
  }, [txConfirmed, txHash, tipId, pageStatus, tip?.amountUsd]);

  const handleMethodSelect = useCallback(
    (method: PaymentMethodId) => {
      setSelectedMethod(method);
      trackPaymentEvent('payment_method_selected', { method, tipId });
    },
    [tipId]
  );

  function handleDirectTransfer() {
    if (!tip || !address) return;
    setPageStatus('sending');
    setErrorMsg(null);
    resetWrite();

    const timer = createPaymentTimer();
    trackPaymentEvent('payment_attempted', {
      method: 'direct',
      tipId,
      amountUsd: tip.amountUsd,
    });

    const rawAmount = parseUnits(
      tip.amountUsd.toFixed(USDC_DECIMALS),
      USDC_DECIMALS
    );

    writeContract(
      {
        address: USDC_ADDRESS,
        abi: ERC20_TRANSFER_ABI,
        functionName: 'transfer',
        args: [tip.toAddress as Hex, rawAmount],
        chainId: abstract.id,
      },
      {
        onError: (err) => {
          const msg =
            err instanceof Error ? err.message : 'Transaction rejected';
          trackPaymentEvent('payment_failed', {
            method: 'direct',
            tipId,
            error: msg,
            durationMs: timer.elapsed(),
          });
          setErrorMsg(msg);
          setPageStatus('error');
        },
      }
    );
  }

  async function handleX402Pay() {
    if (!tip || !isConnected || !address || !walletClient) return;
    setPageStatus('paying');
    const signerAddress =
      walletClient.account?.address ?? (address as `0x${string}`);
    setErrorMsg(null);

    const timer = createPaymentTimer();
    trackPaymentEvent('payment_attempted', {
      method: 'x402',
      tipId,
      amountUsd: tip.amountUsd,
    });

    try {
      const { wrapFetchWithPaymentFromConfig } = await import('@x402/fetch');
      const { ExactEvmScheme } = await import('@x402/evm/exact/client');

      const extended = walletClient.extend(publicActions);
      const signer = {
        address: signerAddress,
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

      if (res.ok) {
        trackPaymentEvent('payment_succeeded', {
          method: 'x402',
          tipId,
          amountUsd: tip.amountUsd,
          durationMs: timer.elapsed(),
        });
        setPageStatus('success');
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as Record<string, string>).detail ||
            (data as Record<string, string>).error ||
            `Payment failed (${res.status})`
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'x402 payment failed';
      trackPaymentEvent('payment_failed', {
        method: 'x402',
        tipId,
        error: msg,
        durationMs: timer.elapsed(),
      });
      setErrorMsg(msg);
      setPageStatus('error');
    }
  }

  async function handleMppPay() {
    if (!tip || !isConnected || !walletClient) return;
    setPageStatus('paying');
    setErrorMsg(null);

    const timer = createPaymentTimer();
    trackPaymentEvent('payment_attempted', {
      method: 'mpp',
      tipId,
      amountUsd: tip.amountUsd,
    });

    try {
      const { Mppx, tempo } = await import('mppx/client');

      // Create MPP client with tempo charge method using the connected wallet
      const mppx = Mppx.create({
        methods: [tempo.charge({ account: walletClient.account })],
        polyfill: false,
      });

      // mppx.fetch auto-handles the 402 challenge/response flow
      const res = await mppx.fetch(`/api/tips/${tipId}/pay`);

      if (res.ok) {
        trackPaymentEvent('payment_succeeded', {
          method: 'mpp',
          tipId,
          amountUsd: tip.amountUsd,
          durationMs: timer.elapsed(),
        });
        setPageStatus('success');
      } else {
        const data = await res.json().catch(() => ({}));
        const detail =
          (data as Record<string, string>).detail ||
          (data as Record<string, string>).error;
        throw new Error(detail || `MPP payment failed (${res.status})`);
      }
    } catch (err) {
      // Map raw errors to user-friendly messages
      const userError = mapMppError(err);
      trackPaymentEvent('payment_failed', {
        method: 'mpp',
        tipId,
        error: userError.message,
        durationMs: timer.elapsed(),
      });
      setErrorMsg(userError.message);
      setPageStatus('error');
    }
  }

  function handlePay() {
    switch (selectedMethod) {
      case 'x402':
        return handleX402Pay();
      case 'mpp':
        return handleMppPay();
      case 'direct':
        return handleDirectTransfer();
    }
  }

  const isProcessing =
    pageStatus === 'sending' ||
    pageStatus === 'verifying' ||
    pageStatus === 'paying';

  const statusLabel: Record<string, string> = {
    paying: `Processing ${selectedMethod === 'mpp' ? 'MPP' : 'x402'} payment...`,
    sending: 'Confirming transaction...',
    verifying: 'Verifying payment...',
  };

  const buttonLabel = isProcessing
    ? statusLabel[pageStatus]
    : `Pay ${tip ? `$${tip.amountUsd.toFixed(2)}` : ''} via ${selectedMethod === 'x402' ? 'x402' : selectedMethod === 'mpp' ? 'MPP' : 'Direct Transfer'}`;

  const formattedAmount = tip ? `$${tip.amountUsd.toFixed(2)}` : '';

  const unavailableReasons: Partial<Record<PaymentMethodId, string>> = {};
  if (mppUnavailableReason) {
    unavailableReasons.mpp = mppUnavailableReason;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <div className="mx-auto max-w-lg px-4 pt-4">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }]} current="Tip" />
      </div>

      <main className="mx-auto max-w-lg px-4 pt-12 pb-24">
        {pageStatus === 'loading' && (
          <div className="rounded-xl border border-border bg-card p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 animate-pulse rounded-xl bg-muted" />
              <div className="space-y-2 flex-1">
                <div className="h-5 w-32 animate-pulse rounded bg-muted" />
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              </div>
            </div>
            <div className="h-10 animate-pulse rounded-lg bg-muted" />
            <div className="h-10 animate-pulse rounded-md bg-muted" />
          </div>
        )}

        {pageStatus === 'error' && !tip && (
          <div className="rounded-xl border border-border bg-card p-8 text-center space-y-4">
            <p className="text-lg font-semibold">Tip not found</p>
            <p className="text-sm text-muted-foreground">
              {errorMsg || 'This tip link may have expired or is invalid.'}
            </p>
            <Button variant="outline" asChild>
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        )}

        {tip && pageStatus !== 'loading' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <p className="text-xs font-semibold tracking-widest text-primary uppercase">
                Tipped Kudos
              </p>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Send {formattedAmount} USDC
              </h1>
            </div>

            {/* Tip card */}
            <div className="rounded-xl border border-border bg-card p-6 space-y-5">
              {/* Agent info */}
              <div className="flex items-center gap-3">
                <AgentAvatar
                  name={tip.agentName}
                  imageUrl={tip.agentImageUrl}
                  size={56}
                  className="rounded-xl ring-2 ring-primary/20"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-lg truncate">
                    {tip.agentName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Agent #{tip.agentTokenId}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold text-primary">
                    {formattedAmount}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    USDC
                  </p>
                </div>
              </div>

              {/* Message */}
              {tip.message && (
                <div className="rounded-lg bg-muted/30 border border-border/50 p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Kudos message
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    &ldquo;{tip.message}&rdquo;
                  </p>
                </div>
              )}

              {/* Destination */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Recipient wallet</span>
                <span className="font-mono">
                  {tip.toAddress.slice(0, 8)}...{tip.toAddress.slice(-6)}
                </span>
              </div>

              {/* Status-dependent content */}
              {pageStatus === 'success' ? (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-5 text-center space-y-3">
                  <div className="text-3xl">&#10003;</div>
                  <p className="text-lg font-semibold">Tip Sent</p>
                  <p className="text-sm text-muted-foreground">
                    {formattedAmount} USDC sent to {tip.agentName}
                  </p>
                  <a
                    href={`/agent/${tip.agentChainId}/${tip.agentTokenId}`}
                    className="text-sm text-primary hover:underline inline-block"
                  >
                    View agent profile
                  </a>
                </div>
              ) : tip.status === 'expired' ? (
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 text-center space-y-2">
                  <p className="text-sm font-medium text-yellow-400">
                    This tip link has expired
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tip links expire after 24 hours. The kudos is still recorded
                    onchain.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Payment method selector */}
                  {paymentMethods.length > 1 && (
                    <PaymentMethodSelector
                      methods={paymentMethods}
                      selected={selectedMethod}
                      onSelect={handleMethodSelect}
                      disabled={isProcessing}
                      unavailableReasons={unavailableReasons}
                    />
                  )}

                  {/* Pay button */}
                  {!isConnected ? (
                    <Button
                      size="lg"
                      className="w-full"
                      onClick={() => openConnectModal?.()}
                    >
                      Connect Wallet to Pay
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className="w-full"
                      onClick={handlePay}
                      disabled={isProcessing}
                    >
                      {buttonLabel}
                    </Button>
                  )}

                  {isConnected && address && (
                    <p className="text-xs text-muted-foreground text-center">
                      Connected: {address.slice(0, 6)}...{address.slice(-4)}
                    </p>
                  )}

                  {pageStatus === 'error' && errorMsg && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-400 text-center">
                      {errorMsg}
                      <button
                        onClick={() => {
                          setPageStatus('ready');
                          setErrorMsg(null);
                        }}
                        className="block mx-auto mt-2 text-xs text-muted-foreground hover:text-foreground underline"
                      >
                        Try again
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Payment info footer */}
            {pageStatus !== 'success' && tip.status !== 'expired' && (
              <div className="rounded-lg border border-border/50 bg-card/50 p-3 space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Supported Payment Rails
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This tip accepts{' '}
                  <span className="text-foreground font-medium">x402</span>
                  {paymentMethods.some((m) => m.id === 'mpp') && (
                    <>
                      , <span className="text-foreground font-medium">MPP</span>
                    </>
                  )}
                  , and{' '}
                  <span className="text-foreground font-medium">
                    direct USDC transfer
                  </span>{' '}
                  on Abstract.
                </p>
              </div>
            )}

            {/* Kudos link */}
            <p className="text-center">
              <a
                href={`/kudos/${tip.kudosTxHash}`}
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                View original kudos transaction
              </a>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
