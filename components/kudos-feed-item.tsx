import { cn } from '@/lib/utils';
import { CategoryBadge } from './category-badge';
import type { KudosCategory } from '@/config/contract';

interface KudosFeedItemProps {
  fromName: string;
  toName: string;
  category: KudosCategory;
  message: string;
  timestamp: string;
  tag1?: string;
  value?: number;
  className?: string;
}

export function KudosFeedItem({
  fromName,
  toName,
  category,
  message,
  timestamp,
  tag1,
  value,
  className,
}: KudosFeedItemProps) {
  const isReview = tag1 === 'review';
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-4 space-y-2',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm md:text-base min-w-0">
          <span className="font-semibold truncate">{fromName}</span>
          <span className="text-muted-foreground shrink-0">
            {isReview ? 'reviewed' : 'gave kudos to'}
          </span>
          <span className="font-semibold truncate">{toName}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isReview && value !== undefined && (
            <span
              className={cn(
                'text-xs font-semibold px-1.5 py-0.5 rounded',
                value < 0 && 'text-red-500 bg-red-500/10',
                value > 0 && 'text-green-500 bg-green-500/10',
                value === 0 && 'text-muted-foreground bg-muted'
              )}
            >
              {value > 0 ? `+${value}` : value}
            </span>
          )}
          <span
            className={cn(
              'text-[10px] font-medium px-1.5 py-0.5 rounded-full uppercase tracking-wide',
              isReview
                ? 'bg-orange-500/10 text-orange-500'
                : 'bg-primary/10 text-primary'
            )}
          >
            {isReview ? 'Review' : 'Kudos'}
          </span>
          <CategoryBadge category={category} />
        </div>
      </div>

      {message && (
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
          &ldquo;{message}&rdquo;
        </p>
      )}

      <p className="text-[11px] text-muted-foreground">{timestamp}</p>
    </div>
  );
}
