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
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-3 py-1 text-sm',
        className
      )}
      style={{
        backgroundColor: `${meta.color}15`,
        color: meta.color,
        border: `1px solid ${meta.color}30`,
      }}
    >
      {meta.label}
      {count != null && count > 0 && (
        <span className="ml-1 opacity-60">{count}</span>
      )}
    </span>
  );
}
