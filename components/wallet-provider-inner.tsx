'use client';

import {
  darkTheme,
  lightTheme,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { base } from 'viem/chains';
import { WagmiProvider } from 'wagmi';
import { wagmiConfig } from '@/config/wagmi';

const queryClient = new QueryClient();

const walletTheme = {
  accentColor: '#0052ff',
  accentColorForeground: 'white',
  borderRadius: 'medium' as const,
};

export function WalletProviderInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const { resolvedTheme } = useTheme();
  const theme =
    resolvedTheme === 'dark' ? darkTheme(walletTheme) : lightTheme(walletTheme);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider initialChain={base} theme={theme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
