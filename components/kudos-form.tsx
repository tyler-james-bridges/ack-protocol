'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AgentSearch } from './agent-search';
import { CategoryBadge } from './category-badge';
import { KUDOS_CATEGORIES, type KudosCategory } from '@/config/contract';
import { cn } from '@/lib/utils';
import type { ScanAgent } from '@/lib/api';

interface KudosFormProps {
  onSubmit: (data: {
    agent: ScanAgent;
    category: KudosCategory;
    message: string;
  }) => void;
  isLoading?: boolean;
  className?: string;
}

export function KudosForm({ onSubmit, isLoading, className }: KudosFormProps) {
  const [selectedAgent, setSelectedAgent] = useState<ScanAgent | null>(null);
  const [category, setCategory] = useState<KudosCategory | null>(null);
  const [message, setMessage] = useState('');

  const canSubmit = selectedAgent && category && message.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ agent: selectedAgent, category, message: message.trim() });
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
          placeholder="What did this agent do well?"
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
        {isLoading ? 'Sending...' : 'Give Kudos'}
      </Button>
    </div>
  );
}
