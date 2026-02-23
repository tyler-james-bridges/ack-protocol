import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ txHash: string }>;
}): Promise<Metadata> {
  const { txHash } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ack-onchain.dev';

  try {
    const res = await fetch(`${baseUrl}/api/kudos/${txHash}`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) throw new Error('Not found');
    const data = await res.json();

    const isNegative = data.value < 0;
    const action = isNegative ? 'gave negative feedback to' : 'gave kudos to';
    const title = `${data.from || data.sender.slice(0, 10)} ${action} ${data.agentName}`;
    const description = data.message
      ? `"${data.message}" — ${data.category || 'kudos'} on ACK Protocol`
      : `${data.category || 'Kudos'} — onchain reputation via ERC-8004`;

    return {
      title: `${title} | ACK`,
      description,
      openGraph: {
        title,
        description,
        type: 'article',
        url: `${baseUrl}/kudos/${txHash}`,
        siteName: 'ACK Protocol',
        images: [
          {
            url: `${baseUrl}/api/og/kudos?agent=${encodeURIComponent(data.agentName)}&from=${encodeURIComponent(data.from || data.sender.slice(0, 10))}&category=${encodeURIComponent(data.category || '')}&message=${encodeURIComponent(data.message || '')}&sentiment=${isNegative ? 'negative' : 'positive'}`,
            width: 1200,
            height: 630,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
    };
  } catch {
    return {
      title: 'Kudos | ACK',
      description: 'Onchain reputation via ERC-8004',
    };
  }
}

export default function KudosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
