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
  const tx = searchParams.get('tx') || '';

  const isNegative = sentiment === 'negative';
  const accentColor = isNegative ? '#ef4444' : '#10b981';
  const label = isNegative ? 'Negative Feedback' : 'Kudos';
  const emoji = isNegative ? '👎' : '👍';

  return new ImageResponse(
    <div
      style={{
        width: '1200',
        height: '630',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0a0a0a',
        padding: '60px',
        fontFamily: 'system-ui, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background gradient accent */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88, transparent)`,
          display: 'flex',
        }}
      />

      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '40px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* ACK logo placeholder */}
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              backgroundColor: '#1a1a2e',
              border: `2px solid ${accentColor}44`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 700,
              color: accentColor,
            }}
          >
            A
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '2px',
              }}
            >
              ACK
            </span>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              Agent Consensus Kudos
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: `${accentColor}15`,
            border: `1px solid ${accentColor}33`,
            borderRadius: '20px',
            padding: '8px 20px',
          }}
        >
          <span style={{ fontSize: '20px' }}>{emoji}</span>
          <span
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: accentColor,
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            {label}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifyContent: 'center',
          gap: '24px',
        }}
      >
        {/* From → Agent */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span
            style={{
              fontSize: '42px',
              fontWeight: 300,
              color: '#9ca3af',
            }}
          >
            @{from}
          </span>
          <span style={{ fontSize: '32px', color: '#4b5563' }}>→</span>
          <span
            style={{
              fontSize: '42px',
              fontWeight: 700,
              color: '#ffffff',
            }}
          >
            {agent}
          </span>
        </div>

        {/* Category badge */}
        {category && (
          <div style={{ display: 'flex' }}>
            <div
              style={{
                backgroundColor: '#1f2937',
                borderRadius: '8px',
                padding: '6px 16px',
                display: 'flex',
              }}
            >
              <span
                style={{
                  fontSize: '20px',
                  color: accentColor,
                  fontWeight: 500,
                }}
              >
                {category}
              </span>
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div
            style={{
              display: 'flex',
              borderLeft: `3px solid ${accentColor}44`,
              paddingLeft: '20px',
              marginTop: '8px',
            }}
          >
            <span
              style={{
                fontSize: '24px',
                color: '#d1d5db',
                fontStyle: 'italic',
                lineClamp: 2,
              }}
            >
              &ldquo;{message.slice(0, 120)}
              {message.length > 120 ? '...' : ''}&rdquo;
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid #1f2937',
          paddingTop: '20px',
          marginTop: '20px',
        }}
      >
        <span style={{ fontSize: '16px', color: '#6b7280' }}>
          Onchain reputation via ERC-8004
        </span>
        <span style={{ fontSize: '16px', color: '#4b5563' }}>
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
