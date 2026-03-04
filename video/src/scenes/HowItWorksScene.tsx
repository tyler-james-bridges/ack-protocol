import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { theme } from '../styles/theme';
import { FadeInText, SlideInText } from '../components/AnimatedText';
import { MockCard } from '../components/MockCard';
import { GreenGlow } from '../components/GreenGlow';

const steps = [
  {
    number: '01',
    title: 'Post Kudos',
    description: '@ack_onchain @agent ++ — give kudos from X.',
    icon: '✦',
  },
  {
    number: '02',
    title: 'Build Streaks',
    description: 'Give kudos daily to build your streak.',
    icon: '🔥',
  },
  {
    number: '03',
    title: 'Explore Reputation',
    description: 'See scores, reviews, and breakdowns.',
    icon: '◈',
  },
  {
    number: '04',
    title: 'Register Your Agent',
    description: 'Get an onchain identity (ERC-8004).',
    icon: '⬡',
  },
];

const STEP_DURATION = 75; // ~2.5s per step

export const HowItWorksScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        background: theme.colors.bg,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 60,
      }}
    >
      <GreenGlow x="50%" y="30%" size={600} delay={0} pulse />

      <FadeInText delay={0} duration={15}>
        <div
          style={{
            fontSize: 20,
            fontFamily: theme.fonts.sans,
            color: theme.colors.green,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            marginBottom: 48,
            fontWeight: 600,
          }}
        >
          How ACK Works
        </div>
      </FadeInText>

      <div
        style={{
          display: 'flex',
          gap: 24,
          width: '100%',
          maxWidth: 1100,
        }}
      >
        {steps.map((step, i) => {
          const stepDelay = 20 + i * STEP_DURATION;
          const isActive = frame >= stepDelay;
          const highlight = interpolate(
            frame,
            [stepDelay, stepDelay + 15],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );

          return (
            <SlideInText
              key={step.number}
              delay={stepDelay}
              duration={20}
              from="bottom"
            >
              <div
                style={{
                  background: theme.colors.card,
                  border: `1px solid ${isActive ? theme.colors.border : 'rgba(255,255,255,0.05)'}`,
                  borderRadius: 16,
                  padding: '28px 24px',
                  width: 240,
                  boxShadow: isActive
                    ? `0 0 30px ${theme.colors.greenGlow}`
                    : 'none',
                  transition: 'border-color 0.3s',
                }}
              >
                <div
                  style={{
                    fontSize: 32,
                    marginBottom: 12,
                  }}
                >
                  {step.icon}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontFamily: theme.fonts.mono,
                    color: theme.colors.green,
                    marginBottom: 8,
                    opacity: 0.7,
                  }}
                >
                  {step.number}
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontFamily: theme.fonts.sans,
                    color: theme.colors.white,
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  {step.title}
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontFamily: theme.fonts.sans,
                    color: theme.colors.muted,
                    lineHeight: 1.4,
                  }}
                >
                  {step.description}
                </div>
              </div>
            </SlideInText>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
