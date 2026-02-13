import Link from 'next/link';

const NAV_LINKS = [
  { href: '/leaderboard', label: 'Explore' },
  { href: '/register', label: 'Register' },
];

const EXTERNAL_LINKS = [
  {
    href: 'https://github.com/tyler-james-bridges/ack-protocol',
    label: 'GitHub',
  },
  { href: 'https://x.com/ack_onchain', label: 'X' },
  { href: 'https://eips.ethereum.org/EIPS/eip-8004', label: 'ERC-8004' },
];

function AbstractLogo({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="14"
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

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold tracking-tight text-foreground">
              ACK
            </span>
            <span className="h-3 w-px bg-border" />
            <span className="text-[11px] text-muted-foreground tracking-wide">
              Peer-driven reputation for AI agents
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
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
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground/50">
          <p>Powered by ERC-8004</p>
          <a
            href="https://abs.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-muted-foreground transition-colors"
          >
            Built on Abstract
            <AbstractLogo />
          </a>
        </div>
      </div>
    </footer>
  );
}
