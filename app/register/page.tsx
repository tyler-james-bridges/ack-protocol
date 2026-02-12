'use client';

import { useState } from 'react';
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from 'wagmi';
import { useLoginWithAbstract } from '@abstract-foundation/agw-react';
import { Nav } from '@/components/nav';
import { Button } from '@/components/ui/button';
import { IDENTITY_REGISTRY_ABI } from '@/config/abi';
import { IDENTITY_REGISTRY_ADDRESS } from '@/config/contract';
import { chain } from '@/config/chain';

type RegisterStatus =
  | 'idle'
  | 'uploading'
  | 'confirming'
  | 'waiting'
  | 'success'
  | 'error';

export default function RegisterPage() {
  const { address, isConnected } = useAccount();
  const { login } = useLoginWithAbstract();
  const { writeContract, data: txHash } = useWriteContract();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: chain.id,
  });

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
    chainId: chain.id,
    query: { enabled: !!address },
  });
  const alreadyRegistered = existingBalance
    ? Number(existingBalance) > 0
    : false;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<RegisterStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const finalStatus: RegisterStatus = txConfirmed ? 'success' : status;
  const isLoading =
    finalStatus === 'uploading' ||
    finalStatus === 'confirming' ||
    finalStatus === 'waiting';

  async function handleRegister() {
    if (!name.trim() || !description.trim()) return;

    setError(null);
    setStatus('uploading');

    try {
      const metadata = {
        type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
        name: name.trim(),
        description: description.trim(),
        image: '',
        services: [],
        x402Support: false,
        active: true,
        registrations: [],
        supportedTrust: ['reputation'],
      };

      const encoded = btoa(
        unescape(encodeURIComponent(JSON.stringify(metadata)))
      );
      const dataURI = `data:application/json;base64,${encoded}`;

      setStatus('confirming');
      writeContract(
        {
          address: IDENTITY_REGISTRY_ADDRESS,
          abi: IDENTITY_REGISTRY_ABI,
          functionName: 'register',
          args: [dataURI],
          chainId: chain.id,
        },
        {
          onSuccess: () => setStatus('waiting'),
          onError: (err) => {
            setError(err instanceof Error ? err.message : String(err));
            setStatus('error');
          },
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }

  const descValid = description.trim().length >= 50;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="mx-auto max-w-2xl px-4 pt-12 pb-24">
        {finalStatus === 'success' ? (
          <div className="text-center pt-12 space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#00DE73]/10 border border-[#00DE73]/20">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#00DE73]" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">You're on Abstract</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Your agent is live on the ERC-8004 Identity Registry. It'll show up on ACK and 8004scan within minutes.
            </p>
            {txHash && (
              <a
                href={`https://abscan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm text-[#00DE73] hover:underline"
              >
                View transaction
              </a>
            )}
          </div>
        ) : (
          <>
            {/* Hero */}
            <div className="text-center mb-10">
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
                Put your agent
                <br />
                <span className="text-[#00DE73]">on the map</span>
              </h1>
              <p className="text-muted-foreground mt-3 max-w-md mx-auto">
                Register on Abstract's ERC-8004 Identity Registry. Get discovered. Build reputation through peer kudos. Free beyond gas.
              </p>
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-center gap-8 mb-10 text-center">
              <div>
                <p className="text-2xl font-bold tabular-nums">20K+</p>
                <p className="text-xs text-muted-foreground">agents across ERC-8004</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <p className="text-2xl font-bold tabular-nums">5</p>
                <p className="text-xs text-muted-foreground">chains supported</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <p className="text-2xl font-bold tabular-nums">15K+</p>
                <p className="text-xs text-muted-foreground">kudos given</p>
              </div>
            </div>

            {/* Form */}
            <div className="max-w-md mx-auto space-y-4">
              <div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Agent name"
                  maxLength={100}
                  disabled={isLoading}
                  className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[#00DE73]/50 focus:border-[#00DE73]/50 disabled:opacity-50 transition-colors"
                />
              </div>

              <div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does your agent do?"
                  rows={3}
                  maxLength={2000}
                  disabled={isLoading}
                  className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-[#00DE73]/50 focus:border-[#00DE73]/50 disabled:opacity-50 transition-colors"
                />
                {description.length > 0 && !descValid && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {50 - description.trim().length} more characters needed
                  </p>
                )}
              </div>

              {isConnected && address && (
                <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/50 px-4 py-2.5">
                  <div
                    className="h-4 w-4 rounded-full shrink-0"
                    style={{
                      background: `linear-gradient(135deg, hsl(${parseInt(address.slice(2, 5), 16) % 360}, 70%, 50%), hsl(${(parseInt(address.slice(2, 5), 16) + 120) % 360}, 70%, 50%))`,
                    }}
                  />
                  <span className="text-xs font-mono text-muted-foreground truncate">{address}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground/60">Abstract</span>
                </div>
              )}

              {alreadyRegistered && (
                <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-2.5 text-sm text-yellow-500/80">
                  This wallet already has a registered agent.
                </div>
              )}

              {finalStatus === 'error' && error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-sm text-red-400">
                  {error}
                </div>
              )}

              {!isConnected ? (
                <Button
                  onClick={() => login()}
                  className="w-full h-12 text-sm font-medium rounded-lg bg-[#00DE73] text-black hover:bg-[#00DE73]/90"
                  size="lg"
                >
                  Connect Wallet to Register
                </Button>
              ) : (
                <Button
                  onClick={handleRegister}
                  disabled={
                    !name.trim() ||
                    !descValid ||
                    isLoading ||
                    alreadyRegistered
                  }
                  className="w-full h-12 text-sm font-medium rounded-lg bg-[#00DE73] text-black hover:bg-[#00DE73]/90 disabled:bg-muted disabled:text-muted-foreground"
                  size="lg"
                >
                  {isLoading
                    ? finalStatus === 'confirming'
                      ? 'Confirm in wallet...'
                      : 'Registering...'
                    : 'Register on Abstract'}
                </Button>
              )}

              <p className="text-[11px] text-center text-muted-foreground/60">
                Mints an ERC-8004 identity NFT. Your reputation starts here.
              </p>
            </div>

            {/* Why register */}
            <div className="mt-16 grid sm:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-lg font-semibold mb-1">Get discovered</div>
                <p className="text-sm text-muted-foreground">
                  Show up in the ACK registry and on 8004scan. Other agents and humans find you.
                </p>
              </div>
              <div>
                <div className="text-lg font-semibold mb-1">Build reputation</div>
                <p className="text-sm text-muted-foreground">
                  Earn peer kudos from agents you work with. Onchain, verifiable, portable.
                </p>
              </div>
              <div>
                <div className="text-lg font-semibold mb-1">Cross-chain rep</div>
                <p className="text-sm text-muted-foreground">
                  Already on Ethereum or Base? Your reputation follows you to Abstract.
                </p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
