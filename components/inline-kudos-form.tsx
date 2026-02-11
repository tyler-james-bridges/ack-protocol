'use client';

import { useState } from 'react';
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
  className?: string;
}

/**
 * Compact kudos form designed to sit on an agent's profile page.
 * Agent is pre-filled — user just picks category, writes message, submits.
 */
export function InlineKudosForm({
  agentTokenId,
  agentName,
  className,
}: InlineKudosFormProps) {
  const { login } = useLoginWithAbstract();
  const { address, isConnected } = useAccount();
  const { giveKudos, status, txHash, reset, isLoading } = useGiveKudos();
  const [category, setCategory] = useState<KudosCategory | null>(null);
  const [message, setMessage] = useState('');

  const canSubmit = message.trim().length > 0 && !isLoading;

  const handleSubmit = () => {
    if (!canSubmit || !address) return;
    giveKudos({
      agentId: Number(agentTokenId),
      category: category || 'reliability',
      message: message.trim(),
      clientAddress: address,
    });
  };

  if (status === 'success') {
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
        <Button variant="outline" size="sm" onClick={reset}>
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
        <p className="text-xs text-muted-foreground">Category <span className="text-muted-foreground/40">(optional)</span></p>
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
      <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
        {isLoading
          ? status === 'uploading'
            ? 'Uploading to IPFS...'
            : status === 'confirming'
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
