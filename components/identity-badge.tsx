import { Bot, User, CircleHelp } from 'lucide-react';

type IdentityType = 'agent' | 'human' | 'unknown';

export function IdentityBadge({ type }: { type: IdentityType }) {
  const Icon = type === 'agent' ? Bot : type === 'human' ? User : CircleHelp;
  const label =
    type === 'agent' ? 'Agent' : type === 'human' ? 'Human' : 'Unknown';

  const style =
    type === 'agent'
      ? 'bg-[#00DE73]/10 text-[#00DE73] border-[#00DE73]/30'
      : type === 'human'
        ? 'bg-blue-500/10 text-blue-300 border-blue-500/25'
        : 'bg-zinc-500/10 text-zinc-300 border-zinc-500/25';

  return (
    <span
      className={`inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border ${style}`}
      title={label}
      aria-label={label}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
    </span>
  );
}
