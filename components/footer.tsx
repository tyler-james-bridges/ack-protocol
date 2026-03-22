import Link from 'next/link';

const NAV_LINKS = [
  { href: '/leaderboard', label: 'EXPLORE' },
  { href: '/register', label: 'REGISTER' },
];

const EXTERNAL_LINKS = [
  {
    href: 'https://github.com/tyler-james-bridges/ack-protocol',
    label: 'GITHUB',
  },
  { href: 'https://x.com/ack_onchain', label: 'X' },
  { href: 'https://eips.ethereum.org/EIPS/eip-8004', label: 'ERC-8004' },
];

export function Footer() {
  return (
    <footer className="border-t-2 border-black bg-white">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold tracking-tight text-black font-mono uppercase">
              ACK
            </span>
            <span className="h-3 w-px bg-black" />
            <span className="text-[11px] text-black/50 tracking-wider font-mono uppercase">
              Peer-driven reputation for the machine economy
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs font-mono uppercase tracking-wider text-black/50 hover:text-black transition-colors"
              >
                {link.label}
              </Link>
            ))}
            {EXTERNAL_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono uppercase tracking-wider text-black/50 hover:text-black transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <div className="mt-4 border-t-2 border-black pt-4 flex items-center justify-between text-[11px] text-black/40 font-mono uppercase tracking-wider">
          <p>Powered by ERC-8004</p>
          <a
            href="https://abs.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-black transition-colors"
          >
            Built on Abstract
          </a>
        </div>
      </div>
    </footer>
  );
}
