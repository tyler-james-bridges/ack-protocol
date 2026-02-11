import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agent Network | ACK Protocol',
  description:
    'Explore the ERC-8004 agent trust network. Interactive visualization of agent relationships across chains.',
  openGraph: {
    title: 'Agent Network | ACK Protocol',
    description: 'Explore the ERC-8004 agent trust network across chains.',
  },
};

export default function GraphLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
