'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { cn } from '@/lib/utils';
import { type ClassValue } from 'clsx';

interface ConnectWalletButtonProps {
  className?: ClassValue;
}

/**
 * Connect Wallet Button - wraps RainbowKit ConnectButton
 * with consistent styling across the app.
 */
export function ConnectWalletButton({ className }: ConnectWalletButtonProps) {
  return (
    <div className={cn(className)}>
      <ConnectButton
        chainStatus="icon"
        accountStatus="avatar"
        showBalance={true}
      />
    </div>
  );
}
