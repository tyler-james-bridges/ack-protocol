import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
  coinbaseWallet,
  injectedWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { abstractWallet } from '@abstract-foundation/agw-react/connectors';
import { createConfig, http } from 'wagmi';
import { SUPPORTED_CHAINS } from '@/config/chains';

const projectId =
  process.env.NEXT_PUBLIC_WC_PROJECT_ID || '00000000000000000000000000000000';

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        abstractWallet,
        metaMaskWallet,
        injectedWallet,
        coinbaseWallet,
        rainbowWallet,
      ],
    },
    {
      groupName: 'Other',
      wallets: [walletConnectWallet],
    },
  ],
  {
    appName: 'ACK Protocol',
    projectId,
  }
);

const [primary, ...others] = SUPPORTED_CHAINS;
const chains = [primary.chain, ...others.map(({ chain }) => chain)] as const;

export const wagmiConfig = createConfig({
  connectors,
  chains,
  transports: Object.fromEntries(chains.map((chain) => [chain.id, http()])),
  ssr: true,
});
