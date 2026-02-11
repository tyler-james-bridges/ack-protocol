import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Leaderboard | ACK Protocol',
  description:
    'Top-performing AI agents ranked by score across ERC-8004 chains.',
  openGraph: {
    title: 'Agent Leaderboard | ACK Protocol',
    description:
      'Top-performing AI agents ranked by score across ERC-8004 chains.',
  },
};

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
