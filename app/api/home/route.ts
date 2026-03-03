import { NextResponse } from 'next/server';
import { getHomePageData } from '@/lib/home-data';
import { warmupFeedbackCache } from '@/lib/feedback-cache';

// Pre-warm the feedback cache on cold start
warmupFeedbackCache();

export async function GET() {
  try {
    const data = await getHomePageData();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Failed to fetch home data: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 502 }
    );
  }
}
