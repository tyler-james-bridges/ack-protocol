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
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-8 md:grid-cols-3 md:items-start">
          <div className="space-y-2">
            <p className="text-base font-semibold tracking-tight text-foreground">
              ACK
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Peer-driven reputation for the machine economy.
            </p>
          </div>

          <div className="space-y-2">
            <p className="type-kicker text-muted-foreground">Product</p>
            <div className="flex flex-col gap-1">
              {PRODUCT_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="type-kicker text-muted-foreground">Ecosystem</p>
            <div className="flex flex-col gap-1">
              {ECOSYSTEM_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground ">
          <p>Powered by ERC-8004</p>
        </div>
      </div>
    </footer>
  );
}
