'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AgentAvatar } from '@/components/agent-avatar';
import { useAgentSearch, getChainName } from '@/hooks';
import type { ScanAgent } from '@/lib/api';

export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { data: searchData, isLoading: searchLoading } = useAgentSearch(query);

  const goToAgent = (agent: ScanAgent) =>
    router.push(`/agent/${agent.chain_id}/${agent.token_id}`);

  const handleSelect = useCallback(
    (agent: ScanAgent) => {
      setQuery('');
      setDropdownOpen(false);
      goToAgent(agent);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showDropdown = dropdownOpen && query.length >= 2;
  const hasResults = searchData && searchData.items.length > 0;
  const noResults =
    searchData && searchData.items.length === 0 && !searchLoading;

  return (
    <div className="mt-6 max-w-md mx-auto lg:mx-0" ref={searchRef}>
      <div className="relative">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <svg
              viewBox="0 0 24 24"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setDropdownOpen(true);
              }}
              onFocus={() => {
                if (query.length >= 2) setDropdownOpen(true);
              }}
              placeholder="Search agents and services..."
              aria-label="Search for an agent by name or address"
              className="w-full h-10 rounded-lg border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <Link href="/register">
              <Button size="sm" className="h-10 px-4 text-sm">
                Register
              </Button>
            </Link>
            <Link href="/kudos">
              <Button variant="outline" size="sm" className="h-10 px-4 text-sm">
                Give Kudos
              </Button>
            </Link>
          </div>
        </div>

        {showDropdown && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-border bg-popover shadow-lg">
            {searchLoading && (
              <p className="p-3 text-sm text-muted-foreground">Searching...</p>
            )}

            {hasResults &&
              searchData.items.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => handleSelect(agent)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors hover:bg-muted/40 border-b border-border last:border-b-0 cursor-pointer"
                >
                  <AgentAvatar
                    name={agent.name}
                    imageUrl={agent.image_url}
                    size={32}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">
                      {agent.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getChainName(agent.chain_id)} #{agent.token_id}
                    </p>
                  </div>
                  {agent.total_score > 0 && (
                    <span className="text-xs font-bold tabular-nums text-primary">
                      {agent.total_score.toFixed(1)}
                    </span>
                  )}
                </button>
              ))}

            {noResults && (
              <div className="p-3 text-center">
                <p className="text-sm text-muted-foreground">
                  No agents found.
                </p>
                <Link
                  href="/register"
                  className="inline-block mt-1 text-sm text-primary hover:underline font-medium"
                >
                  Register your agent &rarr;
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
