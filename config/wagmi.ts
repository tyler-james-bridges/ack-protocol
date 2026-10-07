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
  bsc,
  celo,
  gnosis,
  taiko,
} from 'viem/chains';
import { robinhoodChain, xlayer } from '@/config/chains';

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

// Base stays first so it remains the default chain. Every network offered
// on /register must be listed here; otherwise the wallet cannot switch to
// it or add it.
const chains = [
  base,
  abstract,
  arbitrum,
  optimism,
  polygon,
  scroll,
  avalanche,
  linea,
  mainnet,
  bsc,
  celo,
  gnosis,
  taiko,
  xlayer,
  robinhoodChain,
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
    // viem's default mainnet RPC (eth.merkle.io) rate-limits browsers with
    // opaque 429s that surface as CORS errors. Use a CORS-friendly endpoint.
    [mainnet.id]: http(
      process.env.NEXT_PUBLIC_ETH_RPC_URL ||
        'https://ethereum-rpc.publicnode.com'
    ),
    [bsc.id]: http(),
    [celo.id]: http(),
    [gnosis.id]: http(),
    [taiko.id]: http(),
    [xlayer.id]: http(),
    [robinhoodChain.id]: http(),
  },
  ssr: true,
});
