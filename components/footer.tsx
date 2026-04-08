import Link from 'next/link';

const PRODUCT_LINKS = [
  { href: '/leaderboard', label: 'Explore' },
  { href: '/register', label: 'Register' },
  { href: '/docs/getting-started', label: 'Docs' },
];

const ECOSYSTEM_LINKS = [
  {
    href: 'https://github.com/tyler-james-bridges/ack-protocol',
    label: 'GitHub',
  },
  { href: 'https://x.com/ack_onchain', label: 'X' },
  { href: 'https://eips.ethereum.org/EIPS/eip-8004', label: 'ERC-8004' },
];

export function Footer() {
  return (
    <footer className="border-t-2 border-black bg-white">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-8 md:grid-cols-3 md:items-start">
          <div className="space-y-2">
            <p className="text-base font-bold tracking-tight text-black font-mono uppercase">
              ACK
            </p>
            <p className="text-sm text-black/60 font-mono leading-relaxed max-w-xs">
              Peer-driven reputation for the machine economy.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-black/45">
              Product
            </p>
            <div className="flex flex-col gap-1">
              {PRODUCT_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm font-mono text-black/65 hover:text-black transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-black/45">
              Ecosystem
            </p>
            <div className="flex flex-col gap-1">
              {ECOSYSTEM_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-mono text-black/65 hover:text-black transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 border-t-2 border-black pt-4 flex flex-col gap-2 text-xs text-black/50 font-mono uppercase tracking-wider sm:flex-row sm:items-center sm:justify-between">
          <p>Powered by ERC-8004</p>
          <a
            href="https://abs.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-black transition-colors"
          >
            Built on Abstract
          </a>
        </div>
      </div>
    </footer>
  );
}
