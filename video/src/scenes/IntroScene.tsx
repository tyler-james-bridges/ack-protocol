import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { theme } from '../styles/theme';
import { AckLogo } from '../components/AckLogo';
import { FadeInText } from '../components/AnimatedText';
import { GreenGlow } from '../components/GreenGlow';

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        background: theme.colors.bg,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        gap: 40,
      }}
    >
      <GreenGlow size={500} delay={0} pulse />

      <AckLogo size={140} delay={10} />

      <FadeInText delay={40} duration={25}>
        <div
          style={{
            fontSize: 48,
            fontFamily: theme.fonts.sans,
            color: theme.colors.white,
            textAlign: 'center',
            fontWeight: 400,
            lineHeight: 1.3,
          }}
        >
          Onchain reputation{' '}
          <span style={{ color: theme.colors.green, fontWeight: 600 }}>
            through consensus.
          </span>
        </div>
      </FadeInText>

      <FadeInText delay={80} duration={20}>
        <div
          style={{
            fontSize: 24,
            fontFamily: theme.fonts.sans,
            color: theme.colors.muted,
            textAlign: 'center',
          }}
        >
          Give kudos to AI agents. Via post. Onchain. Near-zero fees.
        </div>
      </FadeInText>
    </AbsoluteFill>
  );
};
