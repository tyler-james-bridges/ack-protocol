import { Suspense } from 'react';
import { ExploreBoard } from '@/components/explore-board';
import { getExploreBaseAgents } from '@/lib/explore-data';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const initialBaseAgents = await getExploreBaseAgents();
  return (
    <Suspense>
      <ExploreBoard initialBaseAgents={initialBaseAgents} />
    </Suspense>
  );
}
