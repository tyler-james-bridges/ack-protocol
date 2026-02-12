import Link from 'next/link';

const FOOTER_LINKS = [
  { href: 'https://github.com/tyler-james-bridges/ack-protocol', label: 'GitHub', external: true },
  { href: 'https://x.com/ack_onchain', label: 'X', external: true },
  { href: 'https://www.8004scan.io', label: '8004scan', external: true },
  { href: 'https://siwa.id/docs', label: 'SIWA Docs', external: true },
  { href: 'https://eips.ethereum.org/EIPS/eip-8004', label: 'ERC-8004 Spec', external: true },
];

export function Footer() {
  return (
    <footer className="relative border-t border-neutral-800/60 bg-neutral-950">
      {/* Green gradient divider line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00DE73]/40 to-transparent" />

      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold tracking-tight text-foreground">ACK</span>
            <span className="h-3 w-px bg-neutral-700" />
            <span className="text-[11px] text-muted-foreground tracking-wide">
              Peer-driven reputation for AI agents
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {FOOTER_LINKS.map((link) =>
              link.external ? (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-[#00DE73] transition-colors"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-xs text-muted-foreground hover:text-[#00DE73] transition-colors"
                >
                  {link.label}
                </Link>
              )
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground/50">
          <p>&copy; 2026 ACK Protocol</p>
          <p className="hidden sm:block">Built on Abstract</p>
        </div>
      </div>
    </footer>
  );
}
