'use client';

import { useState, useEffect } from 'react';
import {
  useAccount,
  useWaitForTransactionReceipt,
  useReadContract,
  useWriteContract,
} from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Nav } from '@/components/nav';
import { Button } from '@/components/ui/button';
import { IDENTITY_REGISTRY_ABI } from '@/config/abi';
import { IDENTITY_REGISTRY_ADDRESS } from '@/config/contract';

type RegisterStatus =
  | 'idle'
  | 'uploading'
  | 'confirming'
  | 'waiting'
  | 'success'
  | 'error';

export default function RegisterPage() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Check if wallet already has an agent registered
  const { data: existingBalance } = useReadContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: [
      {
        inputs: [{ name: 'owner', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    ],
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const alreadyRegistered = existingBalance
    ? Number(existingBalance) > 0
    : false;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<RegisterStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Persist registration data for profile page preview
  useEffect(() => {
    if (txConfirmed && name && address) {
      localStorage.setItem(
        'ack-pending-agent',
        JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          address,
        })
      );
    }
  }, [txConfirmed, name, description, address]);

  const finalStatus: RegisterStatus = txConfirmed
    ? 'success'
    : isPending
      ? 'confirming'
      : txHash
        ? 'waiting'
        : status;
  const isLoading =
    finalStatus === 'uploading' ||
    finalStatus === 'confirming' ||
    finalStatus === 'waiting';

  async function handleRegister() {
    if (!name.trim() || !description.trim()) return;

    setError(null);
    setStatus('uploading');

    try {
      // Build metadata
      const metadata = {
        name: name.trim(),
        description: description.trim(),
        created_at: new Date().toISOString(),
        registered_via: 'ACK Protocol',
      };

      // Encode as base64 data URI (on-chain storage, no IPFS dependency)
      // Use encodeURIComponent for UTF-8 safety (emoji, CJK, etc.)
      const encoded = btoa(
        unescape(encodeURIComponent(JSON.stringify(metadata)))
      );
      const dataURI = `data:application/json;base64,${encoded}`;

      setStatus('confirming');
      writeContract({
        address: IDENTITY_REGISTRY_ADDRESS,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: 'register',
        args: [dataURI],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="mx-auto max-w-lg px-4 pt-16 pb-24">
        <div className="text-center mb-8">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-2">
            ERC-8004
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Register Agent or Service
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-2">
            One page. Four fields. One transaction.
          </p>
        </div>

        {!isConnected ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center space-y-4">
            <h2 className="text-lg md:text-xl font-semibold">
              Connect your wallet
            </h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Connect your wallet to register your agent or service on the
              ERC-8004 Identity Registry.
            </p>
            <Button
              size="lg"
              onClick={() => openConnectModal?.()}
              className="w-full"
            >
              Connect Wallet
            </Button>
          </div>
        ) : finalStatus === 'success' ? (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-8 card-glow space-y-5">
            <div className="text-center">
              <div className="text-4xl mb-4">&#10003;</div>
              <h2 className="text-xl md:text-2xl font-bold mb-2">
                Agent Registered
              </h2>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Owner</span>
                <span className="font-mono text-xs">
                  {address
                    ? `${address.slice(0, 6)}...${address.slice(-4)}`
                    : ''}
                </span>
              </div>
              {description && (
                <div className="pt-1 border-t border-border">
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {description}
                  </p>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Your agent will appear on 8004scan and ACK within a few minutes.
            </p>

            <div className="flex flex-col items-center gap-2">
              {txHash && (
                <a
                  href={`https://abscan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  View transaction on Abscan
                </a>
              )}
              <a
                href="/profile"
                className="text-sm text-primary hover:underline"
              >
                Go to your profile
              </a>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-6 space-y-5 card-glow">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Agent Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. my_agent"
                maxLength={100}
                disabled={isLoading}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {name.length}/100 — Clear, memorable, descriptive
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does your agent do? What problems does it solve?"
                rows={4}
                maxLength={2000}
                disabled={isLoading}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm md:text-base resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {description.length}/2000 — Minimum 50 characters
              </p>
            </div>

            {/* Chain (read-only for now) */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Network
              </label>
              <div className="w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm md:text-base text-muted-foreground">
                Abstract (Chain ID: 2741)
              </div>
            </div>

            {/* Wallet */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Owner Wallet
              </label>
              <div className="w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm md:text-base font-mono text-muted-foreground">
                {address}
              </div>
            </div>

            {/* Already registered warning */}
            {alreadyRegistered && (
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-3 py-2 text-sm text-yellow-400">
                This wallet already has an agent registered on Abstract. One
                identity per wallet.
              </div>
            )}

            {/* Error */}
            {finalStatus === 'error' && error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              onClick={handleRegister}
              disabled={
                !name.trim() ||
                description.trim().length < 50 ||
                isLoading ||
                alreadyRegistered
              }
              className="w-full"
              size="lg"
            >
              {isLoading
                ? finalStatus === 'uploading'
                  ? 'Preparing...'
                  : finalStatus === 'confirming'
                    ? 'Confirm in Wallet...'
                    : 'Waiting for Confirmation...'
                : 'Register Agent'}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Mints an ERC-8004 identity NFT on Abstract. No cost beyond gas.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
