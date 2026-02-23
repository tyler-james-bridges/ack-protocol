import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const agent = searchParams.get('agent') || 'Unknown Agent';
  let from = searchParams.get('from') || 'anonymous';
  const category = searchParams.get('category') || '';
  const message = searchParams.get('message') || '';
  const sentiment = searchParams.get('sentiment') || 'positive';

  // Fix double-@ bug
  if (from.startsWith('@')) {
    from = from.slice(1);
  }

  const isNegative = sentiment === 'negative';

  // Scale agent name font based on length
  const nameLen = agent.length;
  const fontSize =
    nameLen > 30 ? 48 : nameLen > 20 ? 60 : nameLen > 12 ? 76 : 92;

  return new ImageResponse(
    <div
      style={{
        width: '1200',
        height: '630',
        display: 'flex',
        backgroundColor: isNegative ? '#1a0505' : '#030f0a',
        fontFamily: 'system-ui, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow — big subtle circle */}
      <div
        style={{
          position: 'absolute',
          width: '800',
          height: '800',
          borderRadius: '400px',
          top: '-200',
          right: '-200',
          background: isNegative
            ? 'radial-gradient(circle, rgba(239,68,68,0.12) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
          display: 'flex',
        }}
      />

      {/* Main content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px 72px',
          width: '100%',
          height: '100%',
        }}
      >
        {/* Top row: score badge + from */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Score badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '56',
                height: '56',
                borderRadius: '16px',
                backgroundColor: isNegative
                  ? 'rgba(239,68,68,0.15)'
                  : 'rgba(16,185,129,0.15)',
                border: isNegative
                  ? '1px solid rgba(239,68,68,0.3)'
                  : '1px solid rgba(16,185,129,0.3)',
              }}
            >
              <span
                style={{
                  fontSize: '28px',
                  fontWeight: 800,
                  color: isNegative ? '#ef4444' : '#10b981',
                  display: 'flex',
                }}
              >
                {isNegative ? '\u2212' : '+'}1
              </span>
            </div>
            <span
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: isNegative ? '#ef4444' : '#10b981',
                textTransform: 'uppercase',
                letterSpacing: '3px',
                display: 'flex',
              }}
            >
              {isNegative ? 'Feedback' : 'Kudos'}
            </span>
          </div>

          {/* From */}
          <span
            style={{
              fontSize: '18px',
              color: '#555555',
              display: 'flex',
            }}
          >
            from @{from}
          </span>
        </div>

        {/* Center: Agent name — the hero */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <span
            style={{
              fontSize: `${fontSize}px`,
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '-2px',
              lineHeight: 1,
              display: 'flex',
            }}
          >
            {agent}
          </span>
          {category && (
            <span
              style={{
                fontSize: '20px',
                color: '#444444',
                display: 'flex',
              }}
            >
              {category}
            </span>
          )}
        </div>

        {/* Bottom: message quote + brand */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          {message ? (
            <span
              style={{
                fontSize: '18px',
                color: '#3a3a3a',
                maxWidth: '700px',
                lineHeight: 1.4,
                display: 'flex',
              }}
            >
              {'\u201C'}
              {message.slice(0, 90)}
              {message.length > 90 ? '\u2026' : ''}
              {'\u201D'}
            </span>
          ) : (
            <span style={{ display: 'flex' }} />
          )}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span
              style={{
                fontSize: '15px',
                fontWeight: 800,
                color: '#2a2a2a',
                letterSpacing: '4px',
                display: 'flex',
              }}
            >
              ACK
            </span>
            <span style={{ fontSize: '15px', color: '#222', display: 'flex' }}>
              {'\u00B7'}
            </span>
            <span style={{ fontSize: '13px', color: '#333', display: 'flex' }}>
              ack-onchain.dev
            </span>
          </div>
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    }
  );
}
