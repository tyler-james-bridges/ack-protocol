import { TwitterApi } from 'twitter-api-v2';

interface KudosTweet {
  id: string;
  text: string;
  authorUsername: string;
  createdAt: Date;
  mentionedUsers: string[];
  url: string;
}

export class TwitterService {
  private client: TwitterApi | null = null;

  constructor(bearerToken?: string) {
    if (bearerToken) {
      this.client = new TwitterApi(bearerToken);
    }
  }

  async initializeWithUserAuth(accessToken: string) {
    this.client = new TwitterApi(accessToken);
  }

  parseKudosFromText(text: string): { recipient: string; isValid: boolean } | null {
    const kudosPattern = /@(\w+)\s*\+\+/g;
    const match = kudosPattern.exec(text);
    
    if (match && match[1]) {
      return {
        recipient: match[1],
        isValid: true
      };
    }
    
    return null;
  }

  async searchKudosTweets(username: string, sinceId?: string): Promise<KudosTweet[]> {
    if (!this.client) {
      throw new Error('Twitter client not initialized');
    }

    try {
      const query = `@${username} ++`;
      const tweets = await this.client.v2.search(query, {
        'tweet.fields': ['created_at', 'author_id', 'entities'],
        'user.fields': ['username'],
        expansions: ['author_id', 'entities.mentions.username'],
        max_results: 100,
        since_id: sinceId
      });

      const kudosTweets: KudosTweet[] = [];

      for (const tweet of tweets.data.data || []) {
        const kudos = this.parseKudosFromText(tweet.text);
        if (kudos && kudos.recipient.toLowerCase() === username.toLowerCase()) {
          const author = tweets.includes?.users?.find(u => u.id === tweet.author_id);
          
          kudosTweets.push({
            id: tweet.id,
            text: tweet.text,
            authorUsername: author?.username || 'unknown',
            createdAt: new Date(tweet.created_at || Date.now()),
            mentionedUsers: tweet.entities?.mentions?.map(m => m.username) || [],
            url: `https://twitter.com/${author?.username}/status/${tweet.id}`
          });
        }
      }

      return kudosTweets;
    } catch (error) {
      console.error('Error searching tweets:', error);
      throw error;
    }
  }

  async getUserTimeline(username: string, count: number = 20): Promise<KudosTweet[]> {
    if (!this.client) {
      throw new Error('Twitter client not initialized');
    }

    try {
      const user = await this.client.v2.userByUsername(username);
      if (!user.data) {
        throw new Error('User not found');
      }

      const timeline = await this.client.v2.userTimeline(user.data.id, {
        'tweet.fields': ['created_at', 'entities'],
        'user.fields': ['username'],
        expansions: ['entities.mentions.username'],
        max_results: count
      });

      const kudosTweets: KudosTweet[] = [];

      for (const tweet of timeline.data.data || []) {
        const kudos = this.parseKudosFromText(tweet.text);
        if (kudos) {
          kudosTweets.push({
            id: tweet.id,
            text: tweet.text,
            authorUsername: username,
            createdAt: new Date(tweet.created_at || Date.now()),
            mentionedUsers: tweet.entities?.mentions?.map(m => m.username) || [],
            url: `https://twitter.com/${username}/status/${tweet.id}`
          });
        }
      }

      return kudosTweets;
    } catch (error) {
      console.error('Error fetching timeline:', error);
      throw error;
    }
  }

  async verifyTweetExists(tweetId: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('Twitter client not initialized');
    }

    try {
      const tweet = await this.client.v2.singleTweet(tweetId);
      return !!tweet.data;
    } catch (error) {
      console.error('Error verifying tweet:', error);
      return false;
    }
  }

  extractTweetIdFromUrl(url: string): string | null {
    const pattern = /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/;
    const match = url.match(pattern);
    return match ? match[1] : null;
  }
}

// SECURITY: Twitter Bearer Token must never be exposed client-side
// This service should ONLY be instantiated in server-side code (API routes, server components)
// Use: new TwitterService(process.env.TWITTER_BEARER_TOKEN) in server-side code only
export function createTwitterService(): TwitterService {
  if (typeof window !== 'undefined') {
    throw new Error(
      'TwitterService cannot be instantiated on the client side. ' +
      'Twitter API calls must be made from server-side code only.'
    );
  }

  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  if (!bearerToken) {
    throw new Error('TWITTER_BEARER_TOKEN environment variable is not configured');
  }

  return new TwitterService(bearerToken);
}