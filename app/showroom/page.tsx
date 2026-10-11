import type { Metadata } from 'next';
import { Nav } from '@/components/nav';
import { ShowroomClient } from './showroom-client';
import { EXHIBITS, STATUS_TONE } from './projects';

export const metadata: Metadata = {
  title: 'Showroom — Built on Abstract',
  description:
    '13 projects vibe-coded on Abstract in 11 months. Wins, stalls, and everything between, in one 3D room.',
};

const TONE_TEXT = {
  alive: 'text-success',
  done: 'text-muted-foreground',
  fell: 'text-amber-500',
} as const;

export default function ShowroomPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main>
        <div className="relative h-[calc(100dvh-4rem)] min-h-[420px]">
          <ShowroomClient />
          <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center pt-6 px-4 text-center">
            <h1 className=" text-2xl sm:text-3xl font-bold tracking-tight text-white">
              SHOWROOM
            </h1>
            <p className=" text-[11px] text-zinc-400 mt-1">
              Drag to orbit / click a panel to visit
            </p>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center gap-5 pb-4 text-[10px] ">
            <span className="text-success">Alive</span>
            <span className="text-zinc-400">Done</span>
            <span className="text-amber-500">Fell short</span>
          </div>
        </div>

        {/* Text fallback: same data, readable without WebGL */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <h2 className=" text-sm font-bold text-muted-foreground mb-6">
            The log, in plain text
          </h2>
          <ul className="space-y-3 text-sm">
            {EXHIBITS.map((e) => (
              <li
                key={e.name}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
              >
                {e.url ? (
                  <a
                    href={e.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline underline-offset-4 decoration-primary/40 hover:decoration-primary"
                  >
                    {e.name}
                  </a>
                ) : (
                  <span className="font-bold">{e.name}</span>
                )}
                <span
                  className={`text-[11px] uppercase ${TONE_TEXT[STATUS_TONE[e.status]]}`}
                >
                  {e.status}
                </span>
                <span className="text-muted-foreground text-xs">{e.dates}</span>
                <span className="text-muted-foreground/70 text-xs w-full sm:w-auto">
                  {e.blurb}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-xs text-muted-foreground">
            Compiled 2026-07-17 from local git history. Live status verified
            same day.
          </p>
        </section>
      </main>
    </div>
  );
}
