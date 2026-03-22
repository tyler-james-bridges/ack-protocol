/**
 * Inline protocol/chain brand logos for the "Built on" rail.
 * Black fill by default, inherits currentColor for hover inversion.
 */

export function BaseLogo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 111 111"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M54.921 110.034C85.359 110.034 110.034 85.402 110.034 55.017C110.034 24.6319 85.359 0 54.921 0C26.0432 0 2.35281 22.1714 0 50.3923H72.8467V59.6416H0C2.35281 87.8625 26.0432 110.034 54.921 110.034Z"
        fill="#0052FF"
      />
    </svg>
  );
}

export function AbstractLogo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <line
        x1="50"
        y1="5"
        x2="50"
        y2="95"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <line
        x1="5"
        y1="50"
        x2="95"
        y2="50"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <line
        x1="18"
        y1="18"
        x2="82"
        y2="82"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <line
        x1="82"
        y1="18"
        x2="18"
        y2="82"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function EthereumLogo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 256 417"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        fill="currentColor"
        d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z"
        opacity="0.8"
      />
      <path
        fill="currentColor"
        d="M127.962 0L0 212.32l127.962 75.639V154.158z"
        opacity="0.5"
      />
      <path
        fill="currentColor"
        d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.6L256 236.587z"
        opacity="0.8"
      />
      <path
        fill="currentColor"
        d="M127.962 416.905v-104.72L0 236.585z"
        opacity="0.5"
      />
    </svg>
  );
}

export function TempoLogo({ className = '' }: { className?: string }) {
  return (
    <span className={`font-extrabold uppercase tracking-tight ${className}`}>
      TEMPO
    </span>
  );
}

export function X402Logo({ className = '' }: { className?: string }) {
  return <span className={`font-bold tracking-tight ${className}`}>x402</span>;
}
