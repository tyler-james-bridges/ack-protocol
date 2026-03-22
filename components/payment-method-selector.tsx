'use client';

import { cn } from '@/lib/utils';
import type { PaymentMethod, PaymentMethodId } from '@/lib/payments/discovery';

interface PaymentMethodSelectorProps {
  methods: PaymentMethod[];
  selected: PaymentMethodId;
  onSelect: (method: PaymentMethodId) => void;
  disabled?: boolean;
  /** Methods that are unavailable with reasons (e.g. MPP incompatible wallet) */
  unavailableReasons?: Partial<Record<PaymentMethodId, string>>;
}

const METHOD_ICONS: Record<PaymentMethodId, string> = {
  x402: '\u26A1', // lightning
  mpp: '\u2B50', // star
  direct: '\u2192', // arrow
};

const BADGE_COLORS: Record<string, string> = {
  Recommended: 'bg-primary/10 text-primary border-primary/20',
  New: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Fallback: 'bg-muted text-muted-foreground border-border',
  Unavailable: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

export function PaymentMethodSelector({
  methods,
  selected,
  onSelect,
  disabled = false,
  unavailableReasons = {},
}: PaymentMethodSelectorProps) {
  if (methods.length <= 1) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Payment Method
      </p>
      <div className="space-y-2">
        {methods.map((method) => {
          const unavailableReason = unavailableReasons[method.id];
          const isUnavailable = !!unavailableReason;

          return (
            <button
              key={method.id}
              type="button"
              disabled={disabled || isUnavailable}
              onClick={() => !isUnavailable && onSelect(method.id)}
              className={cn(
                'w-full rounded-lg border p-3 text-left transition-all',
                'hover:border-primary/40 hover:bg-card/80',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                isUnavailable && 'opacity-60 cursor-not-allowed',
                selected === method.id && !isUnavailable
                  ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border bg-card/50'
              )}
            >
              <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5" aria-hidden="true">
                  {METHOD_ICONS[method.id]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground">
                      {method.name}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border',
                        isUnavailable
                          ? BADGE_COLORS.Unavailable
                          : BADGE_COLORS[method.badge] || BADGE_COLORS.Fallback
                      )}
                    >
                      {isUnavailable ? 'Unavailable' : method.badge}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {isUnavailable ? unavailableReason : method.description}
                  </p>
                </div>
                <div
                  className={cn(
                    'mt-1 h-4 w-4 rounded-full border-2 shrink-0 transition-colors',
                    selected === method.id && !isUnavailable
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground/30'
                  )}
                >
                  {selected === method.id && !isUnavailable && (
                    <div className="h-full w-full flex items-center justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
