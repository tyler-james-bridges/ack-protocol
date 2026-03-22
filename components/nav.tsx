'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useDisconnect } from 'wagmi';
import { AgentAvatar } from '@/components/agent-avatar';

const NAV_LINKS = [
  { href: '/leaderboard', label: 'DISCOVER' },
  { href: '/kudos', label: 'GIVE KUDOS' },
  { href: '/register', label: 'REGISTER' },
  { href: '/docs', label: 'DOCS' },
];

function WalletDropdown({
  address,
  displayName,
}: {
  address: string;
  displayName: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { disconnect } = useDisconnect();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 border-2 border-black bg-white pl-1 pr-2 py-1 text-[11px] font-mono uppercase tracking-wider text-black hover:bg-black hover:text-white transition-colors"
        type="button"
      >
        <AgentAvatar name={address} size={22} className="rounded-none" />
        {displayName}
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-3.5 w-3.5 ml-0.5 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-0 w-44 border-2 border-black bg-white overflow-hidden z-50">
          <Link
            href={`/address/${address}`}
            prefetch={false}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 text-sm font-mono uppercase tracking-wider text-black hover:bg-black hover:text-white transition-colors"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
            MY PROFILE
          </Link>
          <button
            onClick={() => {
              disconnect();
              setOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-2.5 text-sm font-mono uppercase tracking-wider text-black hover:bg-black hover:text-white transition-colors w-full text-left border-t-2 border-black"
            type="button"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
              />
            </svg>
            DISCONNECT
          </button>
        </div>
      )}
    </div>
  );
}

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
      <nav className="sticky top-0 z-50 border-b-2 border-black bg-white">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-5">
            <Link
              href="/"
              prefetch={false}
              className="flex items-center gap-1.5"
            >
              <span className="text-base font-bold tracking-tight text-black font-mono uppercase">
                ACK
              </span>
            </Link>
            <div className="hidden md:flex items-center">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={false}
                  className={`relative px-3 py-1 text-[13px] font-mono uppercase tracking-wider transition-colors ${
                    isActive(link.href)
                      ? 'text-black font-bold'
                      : 'text-black/50 hover:text-black'
                  }`}
                >
                  {link.label}
                  {isActive(link.href) && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-black" />
                  )}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <ConnectButton.Custom>
              {({
                account,
                chain: connectedChain,
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
                      <WalletDropdown
                        address={account.address}
                        displayName={account.displayName}
                      />
                    ) : (
                      <button
                        onClick={openConnectModal}
                        className="ml-1 h-7 px-3 text-[12px] border-2 border-black bg-black text-white font-mono uppercase tracking-wider hover:bg-white hover:text-black transition-colors"
                        type="button"
                      >
                        CONNECT
                      </button>
                    )}
                  </div>
                );
              }}
            </ConnectButton.Custom>

            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden ml-0.5 flex h-7 w-7 items-center justify-center text-black hover:bg-black hover:text-white transition-colors"
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
            className="absolute inset-0 bg-white/80"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-56 bg-white border-l-2 border-black">
            <div className="flex items-center justify-between h-12 px-4 border-b-2 border-black">
              <span className="text-[13px] font-mono uppercase tracking-wider font-bold text-black">
                MENU
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-7 w-7 items-center justify-center text-black hover:bg-black hover:text-white transition-colors"
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
            <div className="py-0">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={false}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center px-4 py-3 text-[13px] font-mono uppercase tracking-wider border-b border-black/10 transition-colors ${
                    isActive(link.href)
                      ? 'text-black font-bold bg-black/5'
                      : 'text-black/60 hover:bg-black hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {isConnected && address && (
                <Link
                  href={`/address/${address}`}
                  prefetch={false}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center px-4 py-3 text-[13px] font-mono uppercase tracking-wider border-b border-black/10 transition-colors ${
                    pathname.startsWith('/address/')
                      ? 'text-black font-bold bg-black/5'
                      : 'text-black/60 hover:bg-black hover:text-white'
                  }`}
                >
                  MY PROFILE
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
