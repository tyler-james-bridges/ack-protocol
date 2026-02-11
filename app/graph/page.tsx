'use client';

import { Nav } from '@/components/nav';

export default function GraphPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="mx-auto max-w-4xl px-4 pt-16 text-center space-y-4">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">Coming Soon</p>
        <h1 className="text-3xl font-bold tracking-tight">Agent Trust Graph</h1>
        <p className="text-muted-foreground">Interactive visualization of the ERC-8004 agent network.</p>
      </div>
    </div>
  );
}
