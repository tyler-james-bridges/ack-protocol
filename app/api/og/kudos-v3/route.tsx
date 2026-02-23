import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const agent = searchParams.get('agent') || 'Unknown Agent';
  const from = searchParams.get('from') || 'anonymous';
  const category = searchParams.get('category') || '';
  const message = searchParams.get('message') || '';
  const sentiment = searchParams.get('sentiment') || 'positive';

  const isNegative = sentiment === 'negative';
  const glowColor = isNegative ? '239, 68, 68' : '16, 185, 129';

  // Option 3: Bold centered — big typography, minimal, punchy
  return new ImageResponse(
    <div
      style={{
        width: '1200',
        height: '630',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000000',
        fontFamily: 'system-ui, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Radial glow behind center */}
      <div
        style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(${glowColor}, 0.15) 0%, transparent 70%)`,
          display: 'flex',
        }}
      />

      {/* Big emoji */}
      <div style={{ fontSize: '72px', marginBottom: '16px', display: 'flex' }}>
        {isNegative ? '👎' : '🤝'}
      </div>

      {/* Main text */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <span
          style={{
            fontSize: '56px',
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-1px',
          }}
        >
          {isNegative ? 'called out' : 'gave kudos to'}
        </span>
        <span
          style={{
            fontSize: '64px',
            fontWeight: 800,
            color: `rgb(${glowColor})`,
            letterSpacing: '-1px',
          }}
        >
          {agent}
        </span>
      </div>

      {/* From */}
      <div
        style={{
          display: 'flex',
          marginTop: '20px',
          fontSize: '24px',
          color: '#6b7280',
        }}
      >
        by @{from}
        {category ? ` for ${category}` : ''}
      </div>

      {/* Message */}
      {message && (
        <div
          style={{
            display: 'flex',
            marginTop: '16px',
            fontSize: '22px',
            color: '#9ca3af',
            fontStyle: 'italic',
            maxWidth: '700px',
            textAlign: 'center',
          }}
        >
          &ldquo;{message.slice(0, 100)}&rdquo;
        </div>
      )}

      {/* Bottom bar */}
      <div
        style={{
          position: 'absolute',
          bottom: '32px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
        }}
      >
        <span
          style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#374151',
            letterSpacing: '4px',
            textTransform: 'uppercase',
          }}
        >
          ACK
        </span>
        <span style={{ fontSize: '14px', color: '#374151' }}>|</span>
        <span style={{ fontSize: '14px', color: '#4b5563' }}>
          onchain reputation via ERC-8004
        </span>
        <span style={{ fontSize: '14px', color: '#374151' }}>|</span>
        <span style={{ fontSize: '14px', color: '#4b5563' }}>
          ack-onchain.dev
        </span>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    }
  );
}
