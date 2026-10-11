'use client';

import dynamic from 'next/dynamic';

const ShowroomScene = dynamic(
  () => import('./scene').then((m) => m.ShowroomScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground ">
        Loading showroom...
      </div>
    ),
  }
);

export function ShowroomClient() {
  return <ShowroomScene />;
}
