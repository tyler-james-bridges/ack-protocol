'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLoginWithAbstract } from '@abstract-foundation/agw-react';
import { useAccount, useBalance } from 'wagmi';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/theme-toggle';

const NAV_LINKS = [
  { href: '/leaderboard', label: 'Explore' },
  { href: '/kudos', label: 'Kudos' },
  { href: '/register', label: 'Register' },
];

function AddressIdenticon({ address }: { address: string }) {
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

function AbstractLogo({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="18"
      viewBox="0 0 52 47"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M33.7221 31.0658L43.997 41.3463L39.1759 46.17L28.901 35.8895C28.0201 35.0081 26.8589 34.5273 25.6095 34.5273C24.3602 34.5273 23.199 35.0081 22.3181 35.8895L12.0432 46.17L7.22205 41.3463L17.4969 31.0658H33.7141H33.7221Z"
        fill="currentColor"
      />
      <path
        d="M35.4359 28.101L49.4668 31.8591L51.2287 25.2645L37.1978 21.5065C35.9965 21.186 34.9954 20.4167 34.3708 19.335C33.7461 18.2613 33.586 17.0033 33.9063 15.8013L37.6623 1.76283L31.0713 0L27.3153 14.0385L35.4279 28.093L35.4359 28.101Z"
        fill="currentColor"
      />
      <path
        d="M15.7912 28.101L1.76028 31.8591L-0.00158691 25.2645L14.0293 21.5065C15.2306 21.186 16.2316 20.4167 16.8563 19.335C17.4809 18.2613 17.6411 17.0033 17.3208 15.8013L13.5648 1.76283L20.1558 0L23.9118 14.0385L15.7992 28.093L15.7912 28.101Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Nav() {
  const pathname = usePathname();
  const { login, logout } = useLoginWithAbstract();
  const { address, isConnected, status } = useAccount();
  const { data: balance, isLoading: isBalanceLoading } = useBalance({
    address,
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const isConnecting = status === 'connecting' || status === 'reconnecting';

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : '';

  const isActive = (href: string) => pathname === href;

  const formattedBalance =
    balance && !isBalanceLoading
      ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}`
      : null;

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

            {isConnecting ? (
              <Button
                disabled
                size="sm"
                className="ml-1 h-7 px-3 text-[12px] rounded-full"
              >
                Connecting...
              </Button>
            ) : isConnected ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-2 py-1 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all">
                    {address && <AddressIdenticon address={address} />}
                    {formattedBalance ? (
                      <span>{formattedBalance}</span>
                    ) : (
                      <span>{truncatedAddress}</span>
                    )}
                    <AbstractLogo className="ml-0.5 h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      {address && <AddressIdenticon address={address} />}
                      <div>
                        <p className="text-[11px] font-mono text-foreground">
                          {truncatedAddress}
                        </p>
                        <p className="text-[9px] text-muted-foreground">
                          Abstract Global Wallet
                        </p>
                      </div>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => logout()}
                    className="text-muted-foreground cursor-pointer"
                  >
                    Disconnect
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                size="sm"
                onClick={() => login()}
                className="ml-1 h-7 px-3 text-[12px] rounded-full"
              >
                Connect
              </Button>
            )}

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
