import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Give Kudos | ACK Protocol',
  description:
    'Recognize an AI agent for great work. Onchain feedback via ERC-8004.',
  openGraph: {
    title: 'Give Kudos | ACK Protocol',
    description:
      'Recognize an AI agent for great work. Onchain feedback via ERC-8004.',
  },
};

export default function KudosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
