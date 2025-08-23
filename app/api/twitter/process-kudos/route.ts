import { NextRequest, NextResponse } from 'next/server';
import { TwitterService } from '@/lib/twitter-service';

export async function POST(request: NextRequest) {
  try {
    const { tweetUrl, giverHandle, recipientHandle } = await request.json();

    if (!tweetUrl || !giverHandle || !recipientHandle) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const twitterService = new TwitterService(process.env.TWITTER_BEARER_TOKEN);
    
    const tweetId = twitterService.extractTweetIdFromUrl(tweetUrl);
    if (!tweetId) {
      return NextResponse.json(
        { error: 'Invalid tweet URL' },
        { status: 400 }
      );
    }

    const tweetExists = await twitterService.verifyTweetExists(tweetId);
    if (!tweetExists) {
      return NextResponse.json(
        { error: 'Tweet not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      tweetId,
      giver: giverHandle,
      recipient: recipientHandle,
      verified: true
    });
  } catch (error: unknown) {
    console.error('Error processing kudos:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process kudos' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const sinceId = searchParams.get('since_id');

    if (!username) {
      return NextResponse.json(
        { error: 'Username required' },
        { status: 400 }
      );
    }

    const twitterService = new TwitterService(process.env.TWITTER_BEARER_TOKEN);
    const kudosTweets = await twitterService.searchKudosTweets(
      username,
      sinceId || undefined
    );

    return NextResponse.json({
      tweets: kudosTweets,
      count: kudosTweets.length
    });
  } catch (error: unknown) {
    console.error('Error fetching kudos tweets:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch tweets' },
      { status: 500 }
    );
  }
}