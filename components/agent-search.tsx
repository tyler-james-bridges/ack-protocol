'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { AgentCard } from './agent-card';
import { useAgentSearch } from '@/hooks';
import { cn } from '@/lib/utils';
import type { ScanAgent } from '@/lib/api';

interface AgentSearchProps {
  onSelect: (agent: ScanAgent) => void;
  placeholder?: string;
  className?: string;
}

export function AgentSearch({
  onSelect,
  placeholder = 'Search agents by name...',
  className,
}: AgentSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { data, isLoading } = useAgentSearch(query);

  const handleSelect = useCallback(
    (agent: ScanAgent) => {
      onSelect(agent);
      setQuery(agent.name);
      setIsOpen(false);
    },
    [onSelect]
  );

  return (
    <div className={cn('relative', className)}>
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full"
      />

      {isOpen && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-y-auto rounded-xl border border-border bg-popover shadow-lg">
          {isLoading && (
            <p className="p-3 text-sm text-muted-foreground">Searching...</p>
          )}

          {data && data.items.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">No agents found</p>
          )}

          {data?.items.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onClick={() => handleSelect(agent)}
              className="rounded-none border-0 border-b border-border last:border-b-0"
            />
          ))}
        </div>
      )}
    </div>
  );
}
