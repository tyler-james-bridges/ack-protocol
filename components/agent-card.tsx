'use client';

import { cn } from '@/lib/utils';
import { getChainName } from '@/hooks';
import { Badge } from '@/components/ui/badge';
import { AgentAvatar } from '@/components/agent-avatar';
import type { ScanAgent } from '@/lib/api';

interface AgentCardProps {
  agent: ScanAgent;
  onClick?: () => void;
  className?: string;
}

export function AgentCard({ agent, onClick, className }: AgentCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border border-border bg-card p-4',
        'transition-all duration-200 hover:border-primary/30 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AgentAvatar name={agent.name} imageUrl={agent.image_url} size={40} />

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold text-sm">{agent.name}</p>
            {agent.is_verified && (
              <Badge
                variant="secondary"
                className="shrink-0 text-[10px] px-1.5 py-0"
              >
                Verified
              </Badge>
            )}
          </div>

          {agent.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {agent.description}
            </p>
          )}

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-medium">{getChainName(agent.chain_id)}</span>
            <span>#{agent.token_id}</span>
            {agent.total_feedbacks > 0 && (
              <>
                <span className="text-border">|</span>
                <span>{agent.total_feedbacks} feedback</span>
              </>
            )}
            {agent.total_score > 0 && (
              <>
                <span className="text-border">|</span>
                <span>Score {agent.total_score.toFixed(1)}</span>
              </>
            )}
          </div>

          {agent.supported_protocols.length > 0 && (
            <div className="flex gap-1 pt-0.5">
              {agent.supported_protocols.map((proto) => (
                <Badge
                  key={proto}
                  variant="outline"
                  className="text-[10px] px-1.5 py-0"
                >
                  {proto}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
