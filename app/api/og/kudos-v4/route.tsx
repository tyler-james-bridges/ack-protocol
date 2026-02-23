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

  // V4: Clean split card — left side colored, right side content
  // Inspired by Zora/Sound.xyz social cards
  return new ImageResponse(
    <div
      style={{
        width: '1200',
        height: '630',
        display: 'flex',
        backgroundColor: '#000000',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Left panel — solid color block */}
      <div
        style={{
          width: '380',
          height: '630',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: isNegative
            ? 'linear-gradient(180deg, #7f1d1d 0%, #991b1b 50%, #7f1d1d 100%)'
            : 'linear-gradient(180deg, #064e3b 0%, #065f46 50%, #064e3b 100%)',
          gap: '20px',
        }}
      >
        {/* Big score indicator */}
        <div
          style={{
            fontSize: '96px',
            fontWeight: 900,
            color: isNegative ? '#fca5a5' : '#6ee7b7',
            lineHeight: 1,
            display: 'flex',
          }}
        >
          {isNegative ? '-5' : '+5'}
        </div>
        <div
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: isNegative ? '#fca5a580' : '#6ee7b780',
            letterSpacing: '4px',
            textTransform: 'uppercase',
            display: 'flex',
          }}
        >
          {isNegative ? 'FEEDBACK' : 'KUDOS'}
        </div>
      </div>

      {/* Right panel — content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px',
          gap: '28px',
        }}
      >
        {/* Agent name — hero text */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span
            style={{
              fontSize: '18px',
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '3px',
              fontWeight: 500,
            }}
          >
            {isNegative ? 'Feedback for' : 'Kudos for'}
          </span>
          <span
            style={{
              fontSize: '52px',
              fontWeight: 800,
              color: '#f9fafb',
              letterSpacing: '-1px',
              lineHeight: 1.1,
            }}
          >
            {agent}
          </span>
        </div>

        {/* Category pill */}
        {category && (
          <div style={{ display: 'flex' }}>
            <div
              style={{
                display: 'flex',
                backgroundColor: '#1f2937',
                borderRadius: '100px',
                padding: '8px 24px',
                border: '1px solid #374151',
              }}
            >
              <span
                style={{
                  fontSize: '18px',
                  color: isNegative ? '#fca5a5' : '#6ee7b7',
                  fontWeight: 600,
                }}
              >
                {category}
              </span>
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div style={{ display: 'flex' }}>
            <span
              style={{
                fontSize: '22px',
                color: '#9ca3af',
                lineHeight: 1.4,
              }}
            >
              &ldquo;{message.slice(0, 120)}
              {message.length > 120 ? '...' : ''}&rdquo;
            </span>
          </div>
        )}

        {/* From line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px', color: '#4b5563' }}>from</span>
          <span style={{ fontSize: '18px', color: '#d1d5db', fontWeight: 600 }}>
            @{from}
          </span>
        </div>

        {/* Bottom */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginTop: 'auto',
            paddingTop: '24px',
            borderTop: '1px solid #1f2937',
          }}
        >
          <span
            style={{
              fontSize: '20px',
              fontWeight: 800,
              color: '#374151',
              letterSpacing: '3px',
            }}
          >
            ACK
          </span>
          <span style={{ fontSize: '14px', color: '#374151' }}>·</span>
          <span style={{ fontSize: '14px', color: '#4b5563' }}>
            onchain reputation on Abstract
          </span>
          <span style={{ fontSize: '14px', color: '#374151' }}>·</span>
          <span style={{ fontSize: '14px', color: '#4b5563' }}>ERC-8004</span>
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    }
  );
}
