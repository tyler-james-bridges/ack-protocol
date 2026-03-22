import { cn } from '@/lib/utils';
import { CATEGORY_META, type KudosCategory } from '@/config/contract';

interface CategoryBadgeProps {
  category: KudosCategory;
  size?: 'sm' | 'md';
  count?: number;
  className?: string;
}

export function CategoryBadge({
  category,
  size = 'sm',
  count,
  className,
}: CategoryBadgeProps) {
  const meta = CATEGORY_META[category];

  return (
    <span
      className={cn(
        'inline-flex items-center font-mono uppercase tracking-wider border border-black/10',
        size === 'sm' && 'px-2 py-0.5 text-[10px]',
        size === 'md' && 'px-3 py-1 text-xs',
        className
      )}
      style={{
        color: meta.color,
      }}
    >
      {meta.label}
      {count != null && count > 0 && (
        <span className="ml-1 opacity-60">{count}</span>
      )}
    </span>
  );
}
