'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AgentSearch } from './agent-search';
import { CategoryBadge } from './category-badge';
import {
  KUDOS_CATEGORIES,
  REVIEW_MIN_VALUE,
  REVIEW_MAX_VALUE,
  type KudosCategory,
} from '@/config/contract';
import { cn } from '@/lib/utils';
import type { ScanAgent } from '@/lib/api';

interface KudosFormProps {
  onSubmit: (data: {
    agent: ScanAgent;
    category: KudosCategory;
    message: string;
    isReview?: boolean;
    value?: number;
  }) => void;
  isLoading?: boolean;
  className?: string;
}

export function KudosForm({ onSubmit, isLoading, className }: KudosFormProps) {
  const [selectedAgent, setSelectedAgent] = useState<ScanAgent | null>(null);
  const [category, setCategory] = useState<KudosCategory | null>(null);
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<'kudos' | 'review'>('kudos');
  const [reviewValue, setReviewValue] = useState(0);

  const canSubmit = selectedAgent && category && message.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      agent: selectedAgent,
      category,
      message: message.trim(),
      isReview: mode === 'review',
      value: mode === 'review' ? reviewValue : undefined,
    });
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div className="space-y-2">
        <label className="text-sm md:text-base font-medium">Agent</label>
        <AgentSearch onSelect={setSelectedAgent} />
        {selectedAgent && (
          <p className="text-xs text-muted-foreground">
            Selected: <span className="font-medium">{selectedAgent.name}</span>{' '}
            (#{selectedAgent.token_id})
          </p>
        )}
      </div>

      {/* Mode toggle */}
      <div className="space-y-2">
        <label className="text-sm md:text-base font-medium">Type</label>
        <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
          {(['kudos', 'review'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                'px-3 py-1 text-sm rounded-md transition-colors capitalize',
                mode === m
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Review value selector */}
      {mode === 'review' && (
        <div className="space-y-2">
          <label className="text-sm md:text-base font-medium">
            Rating ({REVIEW_MIN_VALUE} to {REVIEW_MAX_VALUE})
          </label>
          <div className="flex flex-wrap gap-1.5">
            {Array.from(
              { length: REVIEW_MAX_VALUE - REVIEW_MIN_VALUE + 1 },
              (_, i) => REVIEW_MIN_VALUE + i
            ).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setReviewValue(v)}
                className={cn(
                  'w-9 h-9 rounded-md text-sm font-medium border transition-colors',
                  reviewValue === v
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50',
                  v < 0 && 'text-red-500',
                  v > 0 && 'text-green-500',
                  v === 0 && 'text-muted-foreground'
                )}
              >
                {v > 0 ? `+${v}` : v}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm md:text-base font-medium">Category</label>
        <div className="flex flex-wrap gap-2">
          {KUDOS_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={cn(
                'transition-all duration-150',
                category === cat
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-full'
                  : 'opacity-60 hover:opacity-100'
              )}
            >
              <CategoryBadge category={cat} size="md" />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm md:text-base font-medium">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            mode === 'review'
              ? 'Describe your experience with this agent...'
              : 'What did this agent do well?'
          }
          rows={3}
          maxLength={280}
          className={cn(
            'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm md:text-base',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'resize-none'
          )}
        />
        <p className="text-xs text-muted-foreground text-right">
          {message.length}/280
        </p>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!canSubmit || isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading
          ? 'Sending...'
          : mode === 'review'
            ? 'Submit Review'
            : 'Give Kudos'}
      </Button>
    </div>
  );
}
