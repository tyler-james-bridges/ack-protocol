'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { ThemeToggle } from '@/components/theme-toggle';

const NAV_LINKS = [
  { href: '/leaderboard', label: 'Explore' },
  { href: '/kudos', label: 'Kudos' },
  { href: '/register', label: 'Register' },
  { href: '/docs', label: 'Docs' },
];

export function Nav() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const isActive = (href: string) => pathname === href;

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/60 backdrop-blur-2xl">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-5">
            <Link href="/" className="flex items-center gap-1.5">
              <span className="text-base font-semibold tracking-tight text-foreground">
                ACK
              </span>
            </Link>
            <div className="hidden md:flex items-center">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-3 py-1 text-[13px] transition-colors ${
                    isActive(link.href)
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {link.label}
                  {isActive(link.href) && (
                    <span className="absolute bottom-0 left-3 right-3 h-px bg-foreground" />
                  )}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />

            <ConnectButton.Custom>
              {({
                account,
                chain: connectedChain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                mounted,
              }) => {
                const ready = mounted;
                const connected = ready && account && connectedChain;

                return (
                  <div
                    {...(!ready && {
                      'aria-hidden': true,
                      style: {
                        opacity: 0,
                        pointerEvents: 'none',
                        userSelect: 'none',
                      },
                    })}
                    className="flex items-center gap-1"
                  >
                    {connected ? (
                      <>
                        <button
                          onClick={openChainModal}
                          className="flex items-center justify-center h-7 w-7 rounded-full border border-border/60 bg-muted/30 hover:border-foreground/20 transition-all"
                          type="button"
                        >
                          {connectedChain.hasIcon && connectedChain.iconUrl && (
                            <img
                              alt={connectedChain.name ?? 'Chain'}
                              src={connectedChain.iconUrl}
                              className="h-4 w-4 rounded-full"
                            />
                          )}
                        </button>
                        <button
                          onClick={openAccountModal}
                          className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all"
                          type="button"
                        >
                          {account.displayName}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={openConnectModal}
                        className="ml-1 h-7 px-3 text-[12px] rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors"
                        type="button"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                );
              }}
            </ConnectButton.Custom>

            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden ml-0.5 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className="absolute inset-0 bg-background/40 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-56 bg-card/95 backdrop-blur-xl border-l border-border/40 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between h-12 px-4 border-b border-border/40">
              <span className="text-[13px] font-medium text-foreground">
                Menu
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-2 py-3 space-y-0.5">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center px-3 py-2 rounded-md text-[13px] transition-colors ${
                    isActive(link.href)
                      ? 'text-foreground bg-muted/40'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {isConnected && (
                <Link
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center px-3 py-2 rounded-md text-[13px] transition-colors ${
                    isActive('/profile')
                      ? 'text-foreground bg-muted/40'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
                  }`}
                >
                  Profile
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
