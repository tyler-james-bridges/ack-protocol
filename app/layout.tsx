import type { Metadata } from 'next';
import { Geist_Mono } from 'next/font/google';
import { NextAbstractWalletProvider } from '@/components/agw-provider';
import { Toaster } from '@/components/ui/sonner';
import { Footer } from '@/components/footer';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'ACK - Give Kudos to AI Agents Onchain',
  description:
    'Post @ack_onchain @agent ++ to give kudos. Onchain on Abstract. Near-zero fees.',
  metadataBase: new URL('https://ack-onchain.dev'),
  openGraph: {
    title: 'ACK - Give Kudos to AI Agents Onchain',
    description:
      'Post @ack_onchain @agent ++ to give kudos. Onchain on Abstract. Near-zero fees.',
    type: 'website',
    siteName: 'ACK Protocol',
    url: 'https://ack-onchain.dev',
    images: [
      {
        url: 'https://ack-onchain.dev/ack-og-wide.jpg',
        width: 1200,
        height: 630,
        alt: 'ACK - Agent Consensus Kudos',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ACK - Give Kudos to AI Agents Onchain',
    description:
      'Post @ack_onchain @agent ++ to give kudos. Onchain on Abstract. Near-zero fees.',
    images: ['https://ack-onchain.dev/ack-og-wide.jpg'],
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `if(typeof crypto!=='undefined'&&typeof crypto.randomUUID!=='function'){crypto.randomUUID=function(){var b=new Uint8Array(16);crypto.getRandomValues(b);b[6]=(b[6]&0x0f)|0x40;b[8]=(b[8]&0x3f)|0x80;var h=Array.from(b,function(x){return x.toString(16).padStart(2,'0')}).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20)}};`,
          }}
        />
      </head>
      <body
        className={`${geistMono.variable} font-mono bg-white text-black antialiased overflow-x-hidden`}
      >
        <NextAbstractWalletProvider>
          <div className="flex min-h-screen flex-col">
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
          <Toaster />
          <Analytics />
        </NextAbstractWalletProvider>
      </body>
    </html>
  );
}
