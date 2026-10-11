'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface AgentAvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: number;
  className?: string;
}

const TILES = [
  '#3d4f7c',
  '#2f5d50',
  '#6b4e2e',
  '#5a3d6b',
  '#3d5a63',
  '#6b3d45',
  '#3f5340',
  '#4a4e68',
  '#6a4030',
  '#2f4f6b',
];

function pickTile(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return TILES[Math.abs(hash) % TILES.length];
}

/**
 * Agent avatar. Uses the agent's image when it loads, otherwise a
 * deterministic color tile with no numeral.
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
          'relative shrink-0 overflow-hidden rounded-md bg-muted',
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

  return (
    <div
      className={cn('shrink-0 rounded-md', className)}
      style={{
        width: size,
        height: size,
        backgroundColor: pickTile(name || 'agent'),
      }}
      aria-hidden
    />
  );
}
