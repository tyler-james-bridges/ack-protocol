'use client';

import { useState, useEffect } from 'react';
import {
  useAccount,
  useWaitForTransactionReceipt,
  useReadContract,
  useWriteContract,
  useSwitchChain,
} from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Nav } from '@/components/nav';
import { Button } from '@/components/ui/button';
import { IDENTITY_REGISTRY_ABI } from '@/config/abi';
import { IDENTITY_REGISTRY_ADDRESS } from '@/config/contract';
import { SUPPORTED_CHAINS } from '@/config/chains';

/** Chains where ERC-8004 identity registry is deployed (deterministic address). */
const REGISTER_CHAINS = SUPPORTED_CHAINS.map((m) => ({
  id: m.chain.id,
  name: m.chain.name,
  color: m.color,
  explorerUrl: m.explorerUrl,
}));

type RegisterStatus =
  | 'idle'
  | 'uploading'
  | 'confirming'
  | 'waiting'
  | 'success'
  | 'error';

interface ServiceEntry {
  protocol: string;
  endpoint: string;
}

const PROTOCOL_OPTIONS = ['Web', 'MCP', 'A2A', 'OASF', 'ENS', 'Email'];

export default function RegisterPage() {
  const {
    address,
    isConnected,
    connector,
    chainId: connectedChainId,
    status: accountStatus,
  } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { switchChain } = useSwitchChain();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedChainId, setSelectedChainId] = useState(2741); // Abstract default
  const [imageUrl, setImageUrl] = useState('');
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [status, setStatus] = useState<RegisterStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const selectedChain = REGISTER_CHAINS.find((c) => c.id === selectedChainId);
  const isAbstractWallet = connector?.id === 'xyz.abs.privy';
  const needsChainSwitch = connectedChainId !== selectedChainId;

  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: selectedChainId,
  });

  // Check if wallet already has an agent on selected chain
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
    chainId: selectedChainId,
    query: { enabled: !!address },
  });
  const alreadyRegistered = existingBalance
    ? Number(existingBalance) > 0
    : false;

  // Persist registration data for profile page preview
  useEffect(() => {
    if (txConfirmed && name && address) {
      localStorage.setItem(
        'ack-pending-agent',
        JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          address,
          chainId: selectedChainId,
        })
      );
    }
  }, [txConfirmed, name, description, address, selectedChainId]);

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

  function addService() {
    setServices([...services, { protocol: 'Web', endpoint: '' }]);
  }

  function removeService(index: number) {
    setServices(services.filter((_, i) => i !== index));
  }

  function updateService(
    index: number,
    field: keyof ServiceEntry,
    value: string
  ) {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: value };
    setServices(updated);
  }

  async function handleRegister() {
    if (!name.trim() || !description.trim() || !address) return;

    setError(null);

    // Switch chain if needed
    if (needsChainSwitch) {
      try {
        switchChain({ chainId: selectedChainId });
        // Give the wallet time to switch, then re-trigger
        setError('Please switch chains in your wallet, then try again.');
        return;
      } catch {
        setError('Failed to switch chain. Please switch manually.');
        return;
      }
    }

    setStatus('uploading');

    try {
      // Build spec-compliant metadata
      const validServices = services.filter((s) => s.endpoint.trim());

      const metadata: Record<string, unknown> = {
        type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
        name: name.trim(),
        description: description.trim(),
        active: true,
      };

      if (imageUrl.trim()) {
        metadata.image = imageUrl.trim();
      }

      // Services array
      const allServices = validServices.map((s) => ({
        name: s.protocol,
        endpoint: s.endpoint.trim(),
      }));

      if (allServices.length > 0) {
        metadata.services = allServices;
      }

      // Encode as base64 data URI
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
        chainId: selectedChainId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }

  const explorerTxUrl = selectedChain
    ? `${selectedChain.explorerUrl}/tx/${txHash}`
    : '';

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
            Mint an onchain identity. Add details now or later.
          </p>
        </div>

        {!isConnected && accountStatus !== 'reconnecting' ? (
          <div className="space-y-4">
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

            {/* Preview of registration form */}
            <div className="rounded-xl border border-border bg-card p-6 space-y-5 opacity-50 pointer-events-none">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Agent Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  disabled
                  placeholder="e.g. my_agent"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm md:text-base disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  disabled
                  placeholder="What does your agent do? What problems does it solve?"
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm md:text-base resize-none disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Agent URI{' '}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </label>
                <input
                  type="text"
                  disabled
                  placeholder="https://..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm md:text-base disabled:opacity-50"
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                You will need: a connected wallet with ETH on Abstract for gas.
              </p>
            </div>
          </div>
        ) : accountStatus === 'reconnecting' ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">Reconnecting wallet...</p>
          </div>
        ) : finalStatus === 'success' ? (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-8 card-glow space-y-5">
            <div className="text-center">
              <div className="text-4xl mb-4">&#10003;</div>
              <h2 className="text-xl md:text-2xl font-bold mb-2">
                Agent Registered
              </h2>
              <p className="text-sm text-muted-foreground">
                on {selectedChain?.name}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Network</span>
                <span className="font-medium">{selectedChain?.name}</span>
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
                  href={explorerTxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  View transaction on explorer
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
                {name.length}/100
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
                rows={3}
                maxLength={2000}
                disabled={isLoading}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm md:text-base resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {description.length}/2000 — Minimum 50 characters
              </p>
            </div>

            {/* Network selector */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Network
              </label>
              <select
                value={selectedChainId}
                onChange={(e) => setSelectedChainId(Number(e.target.value))}
                disabled={isLoading}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              >
                {REGISTER_CHAINS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {isAbstractWallet && selectedChainId !== 2741 && (
                <p className="text-xs text-yellow-400 mt-1">
                  Abstract Global Wallet only supports Abstract. Switch wallets
                  for other chains.
                </p>
              )}
            </div>

            {/* Wallet (auto) */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Owner Wallet
              </label>
              <div className="w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm md:text-base font-mono text-muted-foreground truncate">
                {address}
              </div>
            </div>

            {/* Advanced toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              {showAdvanced ? 'Hide' : 'Add'} optional details
              <span
                className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              >
                &#9660;
              </span>
            </button>

            {showAdvanced && (
              <div className="space-y-5 border-t border-border pt-4">
                {/* Image URL */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://... or ipfs://..."
                    disabled={isLoading}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Avatar or logo. PNG, SVG, or WebP recommended.
                  </p>
                </div>

                {/* Services */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium">
                      Services / Endpoints
                    </label>
                    <button
                      type="button"
                      onClick={addService}
                      disabled={isLoading}
                      className="text-xs text-primary hover:underline disabled:opacity-50"
                    >
                      + Add service
                    </button>
                  </div>
                  {services.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      MCP, A2A, OASF, Web, or other endpoints. You can add these
                      later too.
                    </p>
                  )}
                  <div className="space-y-2">
                    {services.map((s, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <select
                          value={s.protocol}
                          onChange={(e) =>
                            updateService(i, 'protocol', e.target.value)
                          }
                          disabled={isLoading}
                          className="rounded-lg border border-border bg-background px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-24 shrink-0"
                        >
                          {PROTOCOL_OPTIONS.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={s.endpoint}
                          onChange={(e) =>
                            updateService(i, 'endpoint', e.target.value)
                          }
                          placeholder={
                            s.protocol === 'MCP'
                              ? 'https://mcp.example.com/'
                              : s.protocol === 'A2A'
                                ? 'https://agent.example/.well-known/agent-card.json'
                                : s.protocol === 'Email'
                                  ? 'mail@agent.com'
                                  : 'https://...'
                          }
                          disabled={isLoading}
                          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                        />
                        <button
                          type="button"
                          onClick={() => removeService(i)}
                          disabled={isLoading}
                          className="text-muted-foreground hover:text-red-400 px-1 py-2 text-sm"
                        >
                          &#10005;
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Already registered warning */}
            {alreadyRegistered && (
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-3 py-2 text-sm text-yellow-400">
                This wallet already has an agent registered on{' '}
                {selectedChain?.name}. One identity per wallet per chain.
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
                alreadyRegistered ||
                (isAbstractWallet && selectedChainId !== 2741)
              }
              className="w-full"
              size="lg"
            >
              {isLoading
                ? finalStatus === 'uploading'
                  ? 'Preparing metadata...'
                  : finalStatus === 'confirming'
                    ? 'Confirm in wallet...'
                    : 'Waiting for confirmation...'
                : `Register on ${selectedChain?.name || 'chain'}`}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Mints an ERC-8004 identity NFT. No cost beyond gas.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
