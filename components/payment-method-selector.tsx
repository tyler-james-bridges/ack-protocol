'use client';

import { cn } from '@/lib/utils';
import type { PaymentMethod, PaymentMethodId } from '@/lib/payments/discovery';

interface PaymentMethodSelectorProps {
  methods: PaymentMethod[];
  selected: PaymentMethodId;
  onSelect: (method: PaymentMethodId) => void;
  disabled?: boolean;
  unavailableReasons?: Partial<Record<PaymentMethodId, string>>;
}

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
      <p className="text-xs font-mono uppercase tracking-wider text-black/50">
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
                'w-full border-2 p-3 text-left transition-all font-mono',
                'hover:bg-black hover:text-white',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                isUnavailable && 'opacity-60 cursor-not-allowed',
                selected === method.id && !isUnavailable
                  ? 'border-black bg-black text-white'
                  : 'border-black/20 bg-white text-black'
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm uppercase tracking-wider">
                      {method.name}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 border',
                        isUnavailable
                          ? 'border-current opacity-50'
                          : 'border-current'
                      )}
                    >
                      {isUnavailable ? 'UNAVAILABLE' : method.badge}
                    </span>
                  </div>
                  <p className="text-xs opacity-60 mt-0.5 leading-relaxed">
                    {isUnavailable ? unavailableReason : method.description}
                  </p>
                </div>
                <div
                  className={cn(
                    'mt-1 h-4 w-4 border-2 shrink-0 transition-colors',
                    selected === method.id && !isUnavailable
                      ? 'border-current bg-current'
                      : 'border-current opacity-30'
                  )}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
