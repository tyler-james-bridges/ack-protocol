import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
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

export const wagmiConfig = getDefaultConfig({
  appName: 'ACK Protocol',
  projectId,
  chains: [
    abstract,
    arbitrum,
    optimism,
    polygon,
    base,
    scroll,
    avalanche,
    linea,
    mainnet,
  ],
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
