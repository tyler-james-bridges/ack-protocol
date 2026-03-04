import { interpolate, useCurrentFrame } from 'remotion';
import { theme } from '../styles/theme';

export const FadeInText: React.FC<{
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, duration = 20, style }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const translateY = interpolate(frame, [delay, delay + duration], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const TypewriterText: React.FC<{
  text: string;
  delay?: number;
  speed?: number;
  style?: React.CSSProperties;
}> = ({ text, delay = 0, speed = 2, style }) => {
  const frame = useCurrentFrame();
  const charsToShow = Math.floor(
    interpolate(frame, [delay, delay + text.length * speed], [0, text.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );

  const cursorOpacity =
    frame > delay && charsToShow < text.length
      ? Math.round(Math.sin(frame * 0.3) * 0.5 + 0.5)
      : frame > delay + text.length * speed
        ? 0
        : 0;

  return (
    <div style={{ fontFamily: theme.fonts.mono, ...style }}>
      {text.slice(0, charsToShow)}
      <span style={{ opacity: cursorOpacity, color: theme.colors.green }}>
        |
      </span>
    </div>
  );
};

export const SlideInText: React.FC<{
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  from?: 'left' | 'right' | 'bottom';
  style?: React.CSSProperties;
}> = ({ children, delay = 0, duration = 20, from = 'left', style }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const eased = 1 - Math.pow(1 - progress, 3);

  const transforms = {
    left: `translateX(${(1 - eased) * -60}px)`,
    right: `translateX(${(1 - eased) * 60}px)`,
    bottom: `translateY(${(1 - eased) * 40}px)`,
  };

  return (
    <div
      style={{
        opacity: eased,
        transform: transforms[from],
        ...style,
      }}
    >
      {children}
    </div>
  );
};
