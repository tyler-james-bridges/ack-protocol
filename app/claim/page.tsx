'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Nav } from '@/components/nav';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Button } from '@/components/ui/button';
import { AgentSearch } from '@/components/agent-search';
import type { ScanAgent } from '@/lib/api';

type ClaimStep = 'handle' | 'agent' | 'post';
type ClaimStatus = 'idle' | 'loading' | 'pending' | 'claimed' | 'error';

export default function ClaimPage() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  const [step, setStep] = useState<ClaimStep>('handle');
  const [handle, setHandle] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<ScanAgent | null>(null);
  const [challenge, setChallenge] = useState('');
  const [status, setStatus] = useState<ClaimStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const postText = challenge ? `@ack_onchain ${challenge}` : '';
  const postIntentUrl = `https://x.com/intent/post?text=${encodeURIComponent(postText)}`;

  const handleSelectAgent = useCallback((agent: ScanAgent) => {
    setSelectedAgent(agent);
  }, []);

  async function handleSubmitChallenge() {
    if (!handle.trim() || !selectedAgent || !address) return;

    setError(null);
    setStatus('loading');

    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: handle.trim().toLowerCase(),
          address,
          agentId: Number(selectedAgent.token_id),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create challenge');
        setStatus('error');
        return;
      }

      setChallenge(data.challenge);
      setStatus('pending');
      setStep('post');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setStatus('error');
    }
  }

  // Poll for claim status
  useEffect(() => {
    if (status !== 'pending' || !handle) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/claim?handle=${encodeURIComponent(handle.trim().toLowerCase())}`
        );
        const data = await res.json();

        if (data.status === 'claimed') {
          setStatus('claimed');
          setTxHash(data.txHash || null);
          clearInterval(interval);
        }
      } catch {
        // Ignore polling errors
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [status, handle]);

  function handleCopy() {
    navigator.clipboard.writeText(postText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <Nav />
      <div className="mx-auto max-w-lg px-4 pt-4">
        <Breadcrumbs
          items={[{ label: 'Home', href: '/' }]}
          current="Claim Handle"
        />
      </div>
      <main className="mx-auto max-w-lg px-4 pt-16 pb-24">
        <div className="text-center mb-8">
          <p className="text-xs font-semibold tracking-widest text-black uppercase mb-2">
            Handle Claim
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Link your X handle
          </h1>
          <p className="text-sm md:text-base text-black/50 mt-2">
            Prove ownership of your X handle and link it to your agent. Proxy
            kudos will appear on your profile.
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(['handle', 'agent', 'post'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-none flex items-center justify-center text-xs font-bold transition-colors ${
                  step === s
                    ? 'bg-primary text-black-foreground'
                    : i < ['handle', 'agent', 'post'].indexOf(step)
                      ? 'bg-primary/20 text-black'
                      : 'bg-black/5 text-black/50'
                }`}
              >
                {i + 1}
              </div>
              {i < 2 && <div className="w-8 h-px bg-border" />}
            </div>
          ))}
        </div>

        {status === 'claimed' ? (
          <div className="rounded-none border border-primary/30 bg-primary/5 p-8 card-glow space-y-5">
            <div className="text-center">
              <div className="text-4xl mb-4">&#10003;</div>
              <h2 className="text-xl md:text-2xl font-bold mb-2">
                Handle Claimed
              </h2>
              <p className="text-sm text-black/50">
                @{handle} is now linked to {selectedAgent?.name || 'your agent'}
              </p>
            </div>

            <div className="flex flex-col items-center gap-2">
              {txHash && (
                <a
                  href={`https://abscan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-black hover:underline"
                >
                  View transaction on explorer
                </a>
              )}
              {selectedAgent && (
                <a
                  href={`/agent/${selectedAgent.chain_id}/${selectedAgent.token_id}`}
                  className="text-sm text-black hover:underline"
                >
                  View agent profile
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="border-2 border-black bg-white p-6 space-y-5 card-glow">
            {/* Step 1: Handle + Wallet */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                X Handle <span className="text-red-400">*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-black/50 text-sm">@</span>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => {
                    setHandle(e.target.value.replace(/^@/, ''));
                    setError(null);
                  }}
                  placeholder="your_handle"
                  maxLength={15}
                  disabled={step === 'post'}
                  className="flex-1 rounded-none border border-black/20 bg-white px-3 py-2 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Wallet connection */}
            {!isConnected ? (
              <Button
                onClick={() => openConnectModal?.()}
                className="w-full"
                size="lg"
              >
                Connect Wallet
              </Button>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Wallet
                  </label>
                  <div className="w-full rounded-none border border-black/20 bg-white/50 px-3 py-2 text-sm font-mono text-black/50 truncate">
                    {address}
                  </div>
                </div>

                {/* Step 2: Select Agent */}
                {step !== 'post' && (
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Link to Agent <span className="text-red-400">*</span>
                    </label>
                    <AgentSearch
                      onSelect={handleSelectAgent}
                      placeholder="Search your agents..."
                    />
                    {selectedAgent && (
                      <p className="text-xs text-black mt-1.5">
                        Selected: {selectedAgent.name} (#
                        {selectedAgent.token_id})
                      </p>
                    )}
                  </div>
                )}

                {/* Step 3: Post Challenge */}
                {step === 'post' && challenge && (
                  <div className="space-y-3">
                    <p className="text-sm text-black/50">
                      Post this from{' '}
                      <span className="font-medium text-black">@{handle}</span>:
                    </p>
                    <div className="rounded-none border border-primary/20 bg-primary/[0.03] p-4 font-mono text-sm break-all">
                      {postText}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="inline-flex items-center justify-center rounded-none border border-black/20 bg-black/5/30 px-3 py-2 text-sm text-black/50 hover:text-black hover:bg-black/5/50 transition-colors"
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                      <a
                        href={postIntentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-none bg-primary text-black-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        Post
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-black/50">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-none bg-primary opacity-75" />
                        <span className="relative inline-flex rounded-none h-2 w-2 bg-primary" />
                      </span>
                      Waiting for verification...
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="rounded-none border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-400">
                    {error}
                  </div>
                )}

                {/* Submit button (steps 1+2) */}
                {step !== 'post' && (
                  <Button
                    onClick={() => {
                      if (!handle.trim()) {
                        setError('Enter your X handle');
                        return;
                      }
                      if (!selectedAgent) {
                        setError('Select an agent to link');
                        return;
                      }
                      setStep('agent');
                      handleSubmitChallenge();
                    }}
                    disabled={
                      !handle.trim() || !selectedAgent || status === 'loading'
                    }
                    className="w-full"
                    size="lg"
                  >
                    {status === 'loading'
                      ? 'Creating challenge...'
                      : 'Get Verification Code'}
                  </Button>
                )}
              </>
            )}
          </div>
        )}

        {/* Info box */}
        <div className="mt-8 border-2 border-black/50 bg-black/5/20 p-4 space-y-2">
          <p className="text-xs font-medium text-black/50 uppercase tracking-wider">
            How it works
          </p>
          <ol className="text-xs text-black/50 space-y-1 list-decimal list-inside">
            <li>Enter your X handle and connect your wallet</li>
            <li>Select the agent you want to link</li>
            <li>Post the verification code from your X account</li>
            <li>Our bot detects the post and links your handle onchain</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
