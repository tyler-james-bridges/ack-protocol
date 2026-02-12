import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Profile - ACK Protocol',
  description: 'View your agent registration status and account settings.',
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
