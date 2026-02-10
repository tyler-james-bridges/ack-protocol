'use client';

import { Facehash } from 'facehash';
import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface AgentAvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: number;
  className?: string;
}

// Vibrant color palettes — deterministically picked per agent name
const PALETTES = [
  ['#6366f1', '#8b5cf6', '#a78bfa'], // indigo-violet
  ['#f43f5e', '#fb7185', '#fda4af'], // rose
  ['#0ea5e9', '#38bdf8', '#7dd3fc'], // sky
  ['#10b981', '#34d399', '#6ee7b7'], // emerald
  ['#f59e0b', '#fbbf24', '#fcd34d'], // amber
  ['#ec4899', '#f472b6', '#f9a8d4'], // pink
  ['#14b8a6', '#2dd4bf', '#5eead4'], // teal
  ['#8b5cf6', '#c084fc', '#d8b4fe'], // purple
  ['#ef4444', '#f87171', '#fca5a5'], // red
  ['#06b6d4', '#22d3ee', '#67e8f9'], // cyan
];

function pickPalette(name: string): string[] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return PALETTES[Math.abs(hash) % PALETTES.length];
}

/**
 * Agent avatar with Facehash fallback.
 * Uses the agent's image if available, otherwise generates a deterministic
 * colorful face from the agent name via Facehash.
 */
export function AgentAvatar({
  name,
  imageUrl,
  size = 40,
  className,
}: AgentAvatarProps) {
  const [imgError, setImgError] = useState(false);

  if (imageUrl && !imgError) {
    return (
      <div
        className={cn(
          'relative shrink-0 overflow-hidden rounded-lg bg-muted',
          className
        )}
        style={{ width: size, height: size }}
      >
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-cover"
          sizes={`${size}px`}
          unoptimized
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  const colors = pickPalette(name);

  return (
    <div className={cn('shrink-0 rounded-lg overflow-hidden', className)}>
      <Facehash
        name={name}
        size={size}
        colors={colors}
        intensity3d="dramatic"
        enableBlink
      />
    </div>
  );
}
