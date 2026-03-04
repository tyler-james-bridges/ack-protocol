import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { theme } from '../styles/theme';
import { FadeInText } from '../components/AnimatedText';
import { GreenGlow } from '../components/GreenGlow';

const AnimatedCounter: React.FC<{
  target: number;
  label: string;
  suffix?: string;
  delay: number;
}> = ({ target, label, suffix = '', delay }) => {
  const frame = useCurrentFrame();
  const value = Math.floor(
    interpolate(frame, [delay, delay + 60], [0, target], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );
  const opacity = interpolate(frame, [delay, delay + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ textAlign: 'center', opacity }}>
      <div
        style={{
          fontSize: 72,
          fontFamily: theme.fonts.mono,
          color: theme.colors.green,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {value.toLocaleString()}
        {suffix}
      </div>
      <div
        style={{
          fontSize: 20,
          fontFamily: theme.fonts.sans,
          color: theme.colors.muted,
          marginTop: 12,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        {label}
      </div>
    </div>
  );
};

export const StatsScene: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background: theme.colors.bg,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        gap: 60,
      }}
    >
      <GreenGlow x="50%" y="50%" size={700} delay={0} />

      <div style={{ display: 'flex', gap: 100 }}>
        <AnimatedCounter target={29} label="Agents" delay={10} />
        <AnimatedCounter target={41} label="Kudos" delay={25} />
      </div>

      <FadeInText delay={60} duration={20}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: theme.colors.card,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: 12,
            padding: '14px 28px',
            fontSize: 18,
            fontFamily: theme.fonts.sans,
            color: theme.colors.white,
          }}
        >
          Live on{' '}
          <span style={{ color: theme.colors.green, fontWeight: 600 }}>
            Abstract
          </span>
        </div>
      </FadeInText>

      <FadeInText delay={90} duration={20}>
        <div
          style={{
            fontSize: 18,
            fontFamily: theme.fonts.sans,
            color: theme.colors.muted,
            textAlign: 'center',
          }}
        >
          Near-zero fees. ERC-8004 identity. Paymaster-sponsored registration.
        </div>
      </FadeInText>
    </AbsoluteFill>
  );
};
