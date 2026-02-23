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

  // Option 2: Receipt/ticket style — like a physical receipt for an onchain action
  return new ImageResponse(
    <div
      style={{
        width: '1200',
        height: '630',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#111827',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Receipt card */}
      <div
        style={{
          width: '500',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#fafaf9',
          borderRadius: '4px',
          padding: '48px 40px',
          color: '#1a1a1a',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '8px',
            fontSize: '14px',
            letterSpacing: '6px',
            textTransform: 'uppercase',
            color: '#9ca3af',
          }}
        >
          ONCHAIN RECEIPT
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            fontSize: '32px',
            fontWeight: 800,
            letterSpacing: '4px',
            marginBottom: '24px',
          }}
        >
          ACK
        </div>

        {/* Dashed line */}
        <div
          style={{
            display: 'flex',
            borderTop: '2px dashed #d1d5db',
            marginBottom: '24px',
          }}
        />

        {/* Details */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}
        >
          <span style={{ fontSize: '16px', color: '#6b7280' }}>TYPE</span>
          <span style={{ fontSize: '16px', fontWeight: 600 }}>
            {isNegative ? 'NEGATIVE FEEDBACK' : 'KUDOS'}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}
        >
          <span style={{ fontSize: '16px', color: '#6b7280' }}>FROM</span>
          <span style={{ fontSize: '16px', fontWeight: 600 }}>@{from}</span>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}
        >
          <span style={{ fontSize: '16px', color: '#6b7280' }}>TO</span>
          <span style={{ fontSize: '16px', fontWeight: 600 }}>{agent}</span>
        </div>

        {category && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            <span style={{ fontSize: '16px', color: '#6b7280' }}>CATEGORY</span>
            <span style={{ fontSize: '16px', fontWeight: 600 }}>
              {category}
            </span>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}
        >
          <span style={{ fontSize: '16px', color: '#6b7280' }}>CHAIN</span>
          <span style={{ fontSize: '16px', fontWeight: 600 }}>Abstract</span>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '24px',
          }}
        >
          <span style={{ fontSize: '16px', color: '#6b7280' }}>VALUE</span>
          <span style={{ fontSize: '16px', fontWeight: 600 }}>
            {isNegative ? '-5' : '+5'} pts
          </span>
        </div>

        {/* Dashed line */}
        <div
          style={{
            display: 'flex',
            borderTop: '2px dashed #d1d5db',
            marginBottom: '24px',
          }}
        />

        {/* Message */}
        {message && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              fontSize: '18px',
              color: '#374151',
              fontStyle: 'italic',
              textAlign: 'center',
              marginBottom: '24px',
              padding: '0 12px',
            }}
          >
            &ldquo;{message.slice(0, 80)}&rdquo;
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            fontSize: '13px',
            color: '#9ca3af',
            letterSpacing: '2px',
          }}
        >
          VERIFIED ON ERC-8004
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            fontSize: '13px',
            color: '#9ca3af',
            marginTop: '4px',
          }}
        >
          ack-onchain.dev
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    }
  );
}
