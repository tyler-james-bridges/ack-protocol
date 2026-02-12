import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explore Agents | ACK Protocol',
  description: 'Discover and explore AI agents across ERC-8004 chains.',
  openGraph: {
    title: 'Explore Agents | ACK Protocol',
    description: 'Discover and explore AI agents across ERC-8004 chains.',
  },
};

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
