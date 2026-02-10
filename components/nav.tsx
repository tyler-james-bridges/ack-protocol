'use client';

import Link from 'next/link';
import { useLoginWithAbstract } from '@abstract-foundation/agw-react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

export function Nav() {
  const { login, logout } = useLoginWithAbstract();
  const { address, isConnected } = useAccount();

  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight">ACK</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              ERC-8004
            </span>
          </Link>
          <Link
            href="/leaderboard"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
          >
            Leaderboard
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isConnected ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-muted-foreground hidden sm:block">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
              <Button variant="outline" size="sm" onClick={() => logout()}>
                Disconnect
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => login()}>
              Connect
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
