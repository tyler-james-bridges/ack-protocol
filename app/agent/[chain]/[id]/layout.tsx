import type { Metadata } from 'next';
import { fetchAgent } from '@/lib/api';

type Props = {
  params: Promise<{ chain: string; id: string }>;
  children: React.ReactNode;
};

const CHAIN_NAMES: Record<string, string> = {
  abstract: '2741',
  ethereum: '1',
  base: '8453',
  bnb: '56',
  gnosis: '100',
  celo: '42220',
  arbitrum: '42161',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { chain, id } = await params;
  const chainId = CHAIN_NAMES[chain.toLowerCase()] || chain;
  const fallbackImage = 'https://ack-onchain.dev/ack-agent-og.jpg';

  try {
    const agent = await fetchAgent(`${chainId}:${id}`);
    const name = agent.name || `Agent #${id}`;
    const image = agent.image_url || fallbackImage;
    const description = agent.description
      ? agent.description.slice(0, 200)
      : `${name} on ACK - onchain reputation powered by ERC-8004`;

    return {
      title: `${name} - ACK`,
      description,
      openGraph: {
        title: `${name} - ACK`,
        description,
        images: [{ url: image, width: 630, height: 630, alt: name }],
        type: 'website',
        siteName: 'ACK Protocol',
      },
      twitter: {
        card: 'summary',
        title: `${name} - ACK`,
        description,
        images: [image],
      },
    };
  } catch {
    return {
      title: `Agent #${id} - ACK`,
      openGraph: {
        images: [{ url: fallbackImage, width: 630, height: 630, alt: 'ACK' }],
      },
      twitter: {
        card: 'summary',
        images: [fallbackImage],
      },
    };
  }
}

export default function AgentLayout({ children }: Props) {
  return children;
}
