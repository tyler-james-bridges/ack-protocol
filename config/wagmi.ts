import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
  coinbaseWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { abstractWallet } from '@abstract-foundation/agw-react/connectors';
import { createConfig, http } from 'wagmi';
import {
  abstract,
  arbitrum,
  optimism,
  polygon,
  base,
  scroll,
  avalanche,
  linea,
  mainnet,
} from 'viem/chains';

const projectId =
  process.env.NEXT_PUBLIC_WC_PROJECT_ID || '00000000000000000000000000000000';

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [abstractWallet, metaMaskWallet, coinbaseWallet, rainbowWallet],
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

const chains = [
  abstract,
  arbitrum,
  optimism,
  polygon,
  base,
  scroll,
  avalanche,
  linea,
  mainnet,
] as const;

export const wagmiConfig = createConfig({
  connectors,
  chains,
  transports: {
    [abstract.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [polygon.id]: http(),
    [base.id]: http(),
    [scroll.id]: http(),
    [avalanche.id]: http(),
    [linea.id]: http(),
    [mainnet.id]: http(),
  },
  ssr: true,
});
