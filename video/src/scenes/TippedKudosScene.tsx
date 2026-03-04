import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { theme } from '../styles/theme';
import {
  FadeInText,
  TypewriterText,
  SlideInText,
} from '../components/AnimatedText';
import { MockCard } from '../components/MockCard';
import { GreenGlow } from '../components/GreenGlow';

export const TippedKudosScene: React.FC = () => {
  const frame = useCurrentFrame();

  const arrowProgress = interpolate(frame, [90, 120], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: theme.colors.bg,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        gap: 36,
        padding: 80,
      }}
    >
      <GreenGlow x="70%" y="30%" size={400} delay={5} pulse />

      <FadeInText delay={0} duration={15}>
        <div
          style={{
            fontSize: 20,
            fontFamily: theme.fonts.sans,
            color: theme.colors.green,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            fontWeight: 600,
          }}
        >
          Tipped Kudos
        </div>
      </FadeInText>

      <FadeInText delay={10} duration={20}>
        <div
          style={{
            fontSize: 44,
            fontFamily: theme.fonts.sans,
            color: theme.colors.white,
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          Tip agents with USDC
        </div>
      </FadeInText>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 32,
          marginTop: 20,
        }}
      >
        <MockCard delay={40} width={420}>
          <div
            style={{
              fontFamily: theme.fonts.mono,
              fontSize: 20,
              color: theme.colors.white,
              lineHeight: 1.6,
            }}
          >
            <span style={{ color: theme.colors.green }}>@ack_onchain</span>{' '}
            <span style={{ color: theme.colors.muted }}>@agent</span>{' '}
            <span style={{ color: theme.colors.white, fontWeight: 700 }}>
              ++
            </span>{' '}
            <span
              style={{
                background: 'rgba(0, 255, 148, 0.1)',
                color: theme.colors.greenLight,
                padding: '2px 10px',
                borderRadius: 6,
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              $5
            </span>
          </div>
        </MockCard>

        <div
          style={{
            opacity: arrowProgress,
            fontSize: 36,
            color: theme.colors.green,
            transform: `translateX(${(1 - arrowProgress) * -10}px)`,
          }}
        >
          →
        </div>

        <MockCard delay={100} width={280}>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: 14,
                fontFamily: theme.fonts.sans,
                color: theme.colors.muted,
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              USDC on Abstract
            </div>
            <div
              style={{
                fontSize: 40,
                fontFamily: theme.fonts.mono,
                color: theme.colors.green,
                fontWeight: 700,
              }}
            >
              $5.00
            </div>
            <div
              style={{
                fontSize: 14,
                fontFamily: theme.fonts.sans,
                color: theme.colors.muted,
                marginTop: 8,
              }}
            >
              Sent to agent wallet
            </div>
          </div>
        </MockCard>
      </div>
    </AbsoluteFill>
  );
};
