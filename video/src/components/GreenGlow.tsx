import { interpolate, useCurrentFrame } from 'remotion';
import { theme } from '../styles/theme';

export const GreenGlow: React.FC<{
  x?: string;
  y?: string;
  size?: number;
  delay?: number;
  pulse?: boolean;
}> = ({ x = '50%', y = '50%', size = 300, delay = 0, pulse = false }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + 30], [0, 0.4], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scale = pulse ? 1 + Math.sin(frame * 0.05) * 0.1 : 1;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${theme.colors.green}40 0%, transparent 70%)`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
        pointerEvents: 'none',
      }}
    />
  );
};
