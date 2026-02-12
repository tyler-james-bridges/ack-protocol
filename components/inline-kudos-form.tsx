'use client';

import { useState, useEffect } from 'react';
import { useLoginWithAbstract } from '@abstract-foundation/agw-react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { CategoryBadge } from './category-badge';
import { KUDOS_CATEGORIES, type KudosCategory } from '@/config/contract';
import { useGiveKudos } from '@/hooks';
import { cn } from '@/lib/utils';

interface InlineKudosFormProps {
  agentTokenId: string;
  agentName: string;
  ownerAddress?: string;
  className?: string;
}

/**
 * Compact kudos form designed to sit on an agent's profile page.
 * Agent is pre-filled — user just picks category, writes message, submits.
 */
export function InlineKudosForm({
  agentTokenId,
  agentName,
  ownerAddress,
  className,
}: InlineKudosFormProps) {
  const { login } = useLoginWithAbstract();
  const { address, isConnected } = useAccount();
  const { giveKudos, status, txHash, reset, isLoading } = useGiveKudos();
  const [category, setCategory] = useState<KudosCategory | null>(null);
  const [message, setMessage] = useState('');

  // ERC-8004: "feedback submitter MUST NOT be the agent owner or approved operator"
  const isSelfKudos =
    address &&
    ownerAddress &&
    address.toLowerCase() === ownerAddress.toLowerCase();

  const canSubmit = message.trim().length > 0 && !isLoading && !isSelfKudos;

  // After successful kudos, scroll to the kudos feed so the user sees their new kudos
  useEffect(() => {
    if (status !== 'success') return;
    const timer = setTimeout(() => {
      const feed = document.getElementById('kudos-feed');
      if (feed) {
        feed.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 2500); // Wait for query invalidation + refetch
    return () => clearTimeout(timer);
  }, [status]);

  const handleSubmit = () => {
    if (!canSubmit || !address) return;
    giveKudos({
      agentId: Number(agentTokenId),
      category: category || 'reliability',
      message: message.trim(),
      clientAddress: address,
    });
  };

  const handleReset = () => {
    reset();
    setMessage('');
    setCategory(null);
  };

  if (status === 'success') {
    const shareText = `Just gave onchain kudos to ${agentName} on @ack_onchain 🤝\n\nPeer-driven reputation for AI agents, built on ERC-8004.\n\nhttps://ack-protocol.vercel.app/agent/abstract/${agentTokenId}`;
    const shareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

    return (
      <div
        className={cn(
          'rounded-xl border border-primary/30 bg-primary/5 p-6 text-center space-y-3',
          className
        )}
      >
        <p className="text-2xl">🎉</p>
        <p className="font-semibold">Kudos sent to {agentName}!</p>
        <p className="text-sm text-muted-foreground">
          Your feedback is now onchain on the ERC-8004 Reputation Registry.
        </p>
        <div className="flex items-center justify-center gap-3">
          {txHash && (
            <a
              href={`https://abscan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              View transaction →
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
          Give Another
        </Button>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div
        className={cn(
          'rounded-xl border-2 border-dashed border-primary/30 p-6 text-center space-y-3',
          className
        )}
      >
        <p className="font-semibold">Give Kudos to {agentName}</p>
        <p className="text-sm text-muted-foreground">
          Connect your wallet to leave onchain feedback.
        </p>
        <Button onClick={() => login()}>Connect with Abstract</Button>
      </div>
    );
  }

  return (
    <div
      className={cn('rounded-xl border border-border p-5 space-y-4', className)}
      id="give-kudos"
    >
      <p className="font-semibold">Give Kudos to {agentName}</p>

      {/* Category */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Category <span className="text-muted-foreground/40">(optional)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {KUDOS_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={cn(
                'transition-all duration-150 rounded-full cursor-pointer',
                category === cat
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105'
                  : 'opacity-50 hover:opacity-90 hover:scale-105'
              )}
            >
              <CategoryBadge category={cat} size="md" />
            </button>
          ))}
        </div>
        {/* category is optional */}
      </div>

      {/* Message */}
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Message</p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What did this agent do well?"
          rows={3}
          maxLength={280}
          className={cn(
            'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'resize-none'
          )}
        />
        <p className="text-xs text-muted-foreground text-right">
          {message.length}/280
        </p>
      </div>

      {/* Submit */}
      {isSelfKudos && (
        <p className="text-sm text-muted-foreground text-center">
          You own this agent — you can&apos;t give kudos to yourself.
        </p>
      )}
      <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
        {isLoading
          ? status === 'confirming'
            ? 'Confirm in wallet...'
            : 'Waiting for confirmation...'
          : 'Send Kudos'}
      </Button>

      {status === 'error' && (
        <p className="text-sm text-destructive text-center">
          Something went wrong. Please try again.
        </p>
      )}
    </div>
  );
}
