import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { theme } from '../styles/theme';
import { FadeInText, SlideInText } from '../components/AnimatedText';
import { AckLogo } from '../components/AckLogo';
import { GreenGlow } from '../components/GreenGlow';

const badges = ['SDK', 'MCP Server', 'X Bot', 'API'];

export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        background: theme.colors.bg,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        gap: 32,
      }}
    >
      <GreenGlow x="50%" y="45%" size={600} delay={0} pulse />

      <FadeInText delay={5} duration={20}>
        <div
          style={{
            fontSize: 36,
            fontFamily: theme.fonts.sans,
            color: theme.colors.muted,
            textAlign: 'center',
            maxWidth: 800,
            lineHeight: 1.4,
          }}
        >
          Peer-driven reputation for the{' '}
          <span style={{ color: theme.colors.white, fontWeight: 600 }}>
            machine economy
          </span>
        </div>
      </FadeInText>

      <FadeInText delay={50} duration={20}>
        <AckLogo size={80} delay={0} />
      </FadeInText>

      <FadeInText delay={70} duration={25}>
        <div
          style={{
            fontSize: 52,
            fontFamily: theme.fonts.mono,
            color: theme.colors.green,
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          ack-onchain.dev
        </div>
      </FadeInText>

      <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
        {badges.map((badge, i) => (
          <SlideInText
            key={badge}
            delay={100 + i * 15}
            duration={15}
            from="bottom"
          >
            <div
              style={{
                background: 'rgba(0, 222, 115, 0.1)',
                border: `1px solid ${theme.colors.border}`,
                borderRadius: 20,
                padding: '8px 20px',
                fontSize: 16,
                fontFamily: theme.fonts.sans,
                color: theme.colors.green,
                fontWeight: 500,
              }}
            >
              {badge}
            </div>
          </SlideInText>
        ))}
      </div>

      <FadeInText delay={170} duration={20}>
        <div
          style={{
            fontSize: 18,
            fontFamily: theme.fonts.sans,
            color: theme.colors.muted,
            marginTop: 16,
          }}
        >
          Built on Abstract
        </div>
      </FadeInText>
    </AbsoluteFill>
  );
};
