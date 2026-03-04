import { interpolate, useCurrentFrame } from 'remotion';
import { theme } from '../styles/theme';

export const AckLogo: React.FC<{
  size?: number;
  delay?: number;
}> = ({ size = 120, delay = 0 }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scale = interpolate(frame, [delay, delay + 25], [0.8, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pathLength = interpolate(frame, [delay + 5, delay + 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        display: 'flex',
        alignItems: 'center',
        gap: 24,
      }}
    >
      <svg
        viewBox="0 0 32 32"
        width={size}
        height={size}
        style={{ filter: `drop-shadow(0 0 20px ${theme.colors.green}60)` }}
      >
        <rect
          width="32"
          height="32"
          rx="6"
          fill={theme.colors.bg}
          stroke={theme.colors.border}
          strokeWidth="0.5"
        />
        <path
          d="M8.5 16.5 L13.5 21.5 L23.5 11.5"
          fill="none"
          stroke={theme.colors.green}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="30"
          strokeDashoffset={30 * (1 - pathLength)}
        />
      </svg>
      <span
        style={{
          fontSize: size * 0.6,
          fontWeight: 700,
          fontFamily: theme.fonts.sans,
          color: theme.colors.white,
          letterSpacing: '-0.02em',
        }}
      >
        ACK
      </span>
    </div>
  );
};
