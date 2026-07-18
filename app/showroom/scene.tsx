'use client';

import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { EXHIBITS, CHAPTERS, STATUS_TONE, type Exhibit } from './projects';

const TONE_COLOR = {
  alive: '#00DE73',
  done: '#8b949e',
  fell: '#d9a83e',
} as const;

const ARC_SPAN = (Math.PI * 4) / 3; // 240 degrees of wall
const RADIUS = 10;

function exhibitAngle(index: number): number {
  // Arc centered on -Z; timeline sweeps left to right from the initial camera
  const t = EXHIBITS.length === 1 ? 0.5 : index / (EXHIBITS.length - 1);
  return Math.PI / 2 + ARC_SPAN / 2 - t * ARC_SPAN;
}

function ExhibitPanel({ exhibit, index }: { exhibit: Exhibit; index: number }) {
  const [hovered, setHovered] = useState(false);
  const tone = STATUS_TONE[exhibit.status];
  const color = TONE_COLOR[tone];
  const angle = exhibitAngle(index);
  const x = Math.cos(angle) * RADIUS;
  const z = -Math.sin(angle) * RADIUS;
  const clickable = Boolean(exhibit.url);

  return (
    <group
      position={[x, 2.1, z]}
      rotation={[0, angle - Math.PI / 2, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        if (clickable) document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (exhibit.url) window.open(exhibit.url, '_blank', 'noopener');
      }}
      scale={hovered ? 1.06 : 1}
    >
      {/* Frame: emissive border reads as the status light */}
      <mesh position={[0, 0, -0.03]}>
        <planeGeometry args={[2.35, 3.15]} />
        <meshStandardMaterial
          color="#0b0b0b"
          emissive={color}
          emissiveIntensity={
            tone === 'alive' ? (hovered ? 1.4 : 0.8) : hovered ? 0.7 : 0.3
          }
        />
      </mesh>
      {/* Panel face */}
      <mesh>
        <planeGeometry args={[2.2, 3]} />
        <meshStandardMaterial color="#101412" roughness={0.85} />
      </mesh>

      <Text
        position={[0, 1.15, 0.01]}
        fontSize={0.17}
        color="#e6ede7"
        anchorX="center"
        maxWidth={2}
        textAlign="center"
      >
        {exhibit.name}
      </Text>
      <Text
        position={[0, 0.82, 0.01]}
        fontSize={0.09}
        color="#8b949e"
        anchorX="center"
      >
        {exhibit.dates}
      </Text>
      <Text
        position={[0, 0.25, 0.01]}
        fontSize={0.11}
        color="#b9c4bc"
        anchorX="center"
        maxWidth={1.9}
        textAlign="center"
        lineHeight={1.5}
      >
        {exhibit.blurb}
      </Text>
      <Text
        position={[0, -1.05, 0.01]}
        fontSize={0.11}
        color={color}
        anchorX="center"
      >
        {`[ ${exhibit.status.toUpperCase()} ]`}
      </Text>
      <Text
        position={[0, -1.3, 0.01]}
        fontSize={0.08}
        color="#5c6a60"
        anchorX="center"
      >
        {`${exhibit.commits} ${exhibit.commits === 1 ? 'COMMIT' : 'COMMITS'}`}
      </Text>
      {clickable && (
        <Text
          position={[0, -0.75, 0.01]}
          fontSize={0.08}
          color="#00DE73"
          anchorX="center"
        >
          CLICK TO VISIT
        </Text>
      )}
    </group>
  );
}

function ChapterLabels() {
  const labels = useMemo(() => {
    return CHAPTERS.map((chapter) => {
      const indices = EXHIBITS.map((e, i) =>
        e.chapter === chapter ? i : -1
      ).filter((i) => i >= 0);
      const mid =
        (exhibitAngle(indices[0]) + exhibitAngle(indices[indices.length - 1])) /
        2;
      return { chapter, angle: mid };
    });
  }, []);

  return (
    <>
      {labels.map(({ chapter, angle }) => (
        <Text
          key={chapter}
          position={[Math.cos(angle) * RADIUS, 4.4, -Math.sin(angle) * RADIUS]}
          rotation={[0, angle - Math.PI / 2, 0]}
          fontSize={0.16}
          color="#5c6a60"
          anchorX="center"
          letterSpacing={0.2}
        >
          {chapter}
        </Text>
      ))}
    </>
  );
}

function CenterPiece() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.25;
  });
  return (
    <group position={[0, 1.4, 0]}>
      <mesh ref={ref}>
        <icosahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial
          color="#0b0b0b"
          emissive="#00DE73"
          emissiveIntensity={0.55}
          wireframe
        />
      </mesh>
      <Text
        position={[0, -0.95, 0]}
        fontSize={0.14}
        color="#8b949e"
        anchorX="center"
        letterSpacing={0.25}
      >
        BUILT ON ABSTRACT
      </Text>
      <Text
        position={[0, -1.2, 0]}
        fontSize={0.09}
        color="#5c6a60"
        anchorX="center"
      >
        AUG 2025 - JUL 2026 / 1,008 COMMITS
      </Text>
    </group>
  );
}

export function ShowroomScene() {
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 2.4, 7.5], fov: 60 }}
      // pan-y keeps vertical swipes scrolling the page on mobile; horizontal drags orbit
      style={{ touchAction: 'pan-y' }}
    >
      <color attach="background" args={['#070907']} />
      <fog attach="fog" args={['#070907', 8, 26]} />

      <ambientLight intensity={0.35} />
      <directionalLight position={[0, 8, 0]} intensity={0.5} />
      <pointLight
        position={[0, 3, 0]}
        intensity={12}
        color="#00DE73"
        distance={14}
      />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[16, 48]} />
        <meshStandardMaterial color="#0b0f0c" roughness={0.9} metalness={0.1} />
      </mesh>

      <CenterPiece />
      <ChapterLabels />
      {EXHIBITS.map((exhibit, i) => (
        <ExhibitPanel key={exhibit.name} exhibit={exhibit} index={i} />
      ))}

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        maxPolarAngle={Math.PI / 2 - 0.05}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.4}
        target={[0, 2, 0]}
      />
    </Canvas>
  );
}
