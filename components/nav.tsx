'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLoginWithAbstract } from '@abstract-foundation/agw-react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

const NAV_LINKS = [
  { href: '/leaderboard', label: 'Registry' },
  { href: '/graph', label: 'Graph' },
  { href: '/register', label: 'Register' },
];

const AUTH_LINKS = [
  { href: '/profile', label: 'Profile' },
];

function AddressIdenticon({ address }: { address: string }) {
  // Generate a deterministic gradient from the address
  const hash = address.slice(2, 10);
  const hue1 = parseInt(hash.slice(0, 3), 16) % 360;
  const hue2 = (hue1 + 120) % 360;

  return (
    <div
      className="h-5 w-5 rounded-full shrink-0"
      style={{
        background: `linear-gradient(135deg, hsl(${hue1}, 70%, 50%), hsl(${hue2}, 70%, 50%))`,
      }}
    />
  );
}

export function Nav() {
  const pathname = usePathname();
  const { login, logout } = useLoginWithAbstract();
  const { address, isConnected } = useAccount();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const walletRef = useRef<HTMLDivElement>(null);

  // Close wallet dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (walletRef.current && !walletRef.current.contains(e.target as Node)) {
        setWalletOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : '';

  const isActive = (href: string) => pathname === href;

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-neutral-800/60 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          {/* Left: Logo + Desktop Links */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-lg font-bold tracking-tight text-foreground">ACK</span>
              <span className="rounded-full bg-[#00DE73]/10 px-2 py-0.5 text-[10px] font-semibold text-[#00DE73] hidden sm:inline border border-[#00DE73]/20">
                ERC-8004
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {[...NAV_LINKS, ...(isConnected ? AUTH_LINKS : [])].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-3 py-1.5 text-sm rounded-md transition-colors ${
                    isActive(link.href)
                      ? 'text-foreground bg-neutral-800/50'
                      : 'text-muted-foreground hover:text-foreground hover:bg-neutral-800/30'
                  }`}
                >
                  {link.label}
                  {isActive(link.href) && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[calc(50%+6px)] w-6 h-0.5 rounded-full bg-[#00DE73]" />
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Right: Icons + Wallet + Mobile Toggle */}
          <div className="flex items-center gap-1.5">
            <a
              href="https://github.com/tyler-james-bridges/ack-protocol"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-neutral-800/30 transition-colors"
              aria-label="GitHub"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
            <a
              href="https://x.com/ack_onchain"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-neutral-800/30 transition-colors"
              aria-label="X/Twitter"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <ThemeToggle />

            {/* Wallet / Connect */}
            {isConnected ? (
              <div className="relative" ref={walletRef}>
                <button
                  onClick={() => setWalletOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-lg border border-neutral-700/60 bg-neutral-900/50 px-2.5 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground hover:border-[#00DE73]/30 transition-all"
                >
                  {address && <AddressIdenticon address={address} />}
                  {truncatedAddress}
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={`h-3 w-3 transition-transform duration-200 ${walletOpen ? 'rotate-180' : ''}`}
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                {walletOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-neutral-700/60 bg-neutral-950 shadow-xl shadow-black/40 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-3 py-3 border-b border-neutral-800/60">
                      <div className="flex items-center gap-2">
                        {address && <AddressIdenticon address={address} />}
                        <div>
                          <p className="text-xs font-mono text-foreground">{truncatedAddress}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Abstract Global Wallet</p>
                        </div>
                      </div>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setWalletOpen(false)}
                      className="flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-neutral-800/50 transition-colors"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-muted-foreground">
                        <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
                      </svg>
                      My Profile
                    </Link>
                    <button
                      onClick={() => {
                        setWalletOpen(false);
                        logout();
                      }}
                      className="flex items-center gap-2 w-full text-left px-3 py-2.5 text-sm text-muted-foreground hover:bg-neutral-800/50 hover:text-foreground transition-colors border-t border-neutral-800/40"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
                        <path fillRule="evenodd" d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-.943a.75.75 0 10-1.004-1.114l-2.5 2.25a.75.75 0 000 1.114l2.5 2.25a.75.75 0 101.004-1.114l-1.048-.943h9.546A.75.75 0 0019 10z" clipRule="evenodd" />
                      </svg>
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button size="sm" onClick={() => login()} className="ml-1">
                Connect
              </Button>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden ml-1 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-neutral-800/30 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile overlay menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMobileOpen(false)}
          />
          {/* Panel */}
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-neutral-950 border-l border-neutral-800/60 shadow-2xl shadow-black/50 animate-in slide-in-from-right duration-200">
            {/* Close */}
            <div className="flex items-center justify-between h-14 px-4 border-b border-neutral-800/60">
              <span className="text-sm font-semibold text-foreground">Menu</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-neutral-800/30 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Nav links */}
            <div className="px-3 py-4 space-y-1">
              {[...NAV_LINKS, ...(isConnected ? AUTH_LINKS : [])].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive(link.href)
                      ? 'text-foreground bg-neutral-800/50'
                      : 'text-muted-foreground hover:text-foreground hover:bg-neutral-800/30'
                  }`}
                >
                  {isActive(link.href) && (
                    <span className="w-1 h-4 rounded-full bg-[#00DE73]" />
                  )}
                  {!isActive(link.href) && (
                    <span className="w-1 h-4" />
                  )}
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Social links */}
            <div className="px-3 pt-2 border-t border-neutral-800/40 mx-3">
              <div className="flex items-center gap-2 py-3">
                <a
                  href="https://github.com/tyler-james-bridges/ack-protocol"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-neutral-800/30 transition-colors"
                  aria-label="GitHub"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                </a>
                <a
                  href="https://x.com/ack_onchain"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-neutral-800/30 transition-colors"
                  aria-label="X/Twitter"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
