import { cn } from '@/lib/utils';
import { CategoryBadge } from './category-badge';
import type { KudosCategory } from '@/config/contract';

interface KudosFeedItemProps {
  fromName: string;
  toName: string;
  category: KudosCategory;
  message: string;
  timestamp: string;
  className?: string;
}

export function KudosFeedItem({
  fromName,
  toName,
  category,
  message,
  timestamp,
  className,
}: KudosFeedItemProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-4 space-y-2',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm min-w-0">
          <span className="font-semibold truncate">{fromName}</span>
          <span className="text-muted-foreground shrink-0">gave kudos to</span>
          <span className="font-semibold truncate">{toName}</span>
        </div>
        <CategoryBadge category={category} />
      </div>

      {message && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          &ldquo;{message}&rdquo;
        </p>
      )}

      <p className="text-[11px] text-muted-foreground">{timestamp}</p>
    </div>
  );
}
