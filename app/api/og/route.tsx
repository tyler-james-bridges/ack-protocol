import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#0a0a0a',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Dot grid background */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexWrap: 'wrap',
          opacity: 0.15,
        }}
      >
        {Array.from({ length: 600 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 48,
              height: 48,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: 3,
                height: 3,
                borderRadius: '50%',
                background: '#00DE73',
              }}
            />
          </div>
        ))}
      </div>

      {/* Green glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(0,222,115,0.08) 0%, transparent 70%)',
        }}
      />

      {/* Content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          zIndex: 1,
        }}
      >
        {/* ERC-8004 badge */}
        <div
          style={{
            display: 'flex',
            padding: '6px 16px',
            borderRadius: 999,
            border: '1px solid rgba(0,222,115,0.3)',
            background: 'rgba(0,222,115,0.08)',
            fontSize: 14,
            fontWeight: 600,
            color: '#00DE73',
            letterSpacing: 2,
          }}
        >
          ERC-8004
        </div>

        {/* ACK title */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: -2,
            lineHeight: 1,
          }}
        >
          ACK
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: '#00DE73',
            letterSpacing: 1,
          }}
        >
          Agent Consensus Kudos
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 18,
            color: 'rgba(255,255,255,0.5)',
            marginTop: 4,
          }}
        >
          Onchain reputation through consensus.
        </div>

        {/* Built on Abstract */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 24,
            fontSize: 14,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: 1,
          }}
        >
          Built on Abstract
        </div>
      </div>

      {/* Bottom URL */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          fontSize: 14,
          color: 'rgba(255,255,255,0.3)',
          letterSpacing: 1,
        }}
      >
        ack-onchain.dev
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    }
  );
}
