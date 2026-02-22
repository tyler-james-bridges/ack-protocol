/**
 * Twitter API helpers using OAuth 1.0a.
 * No dependency on ElizaOS for now - direct X API calls.
 */

import crypto from 'node:crypto';

const API_KEY = process.env.TWITTER_API_KEY!;
const API_SECRET = process.env.TWITTER_API_SECRET_KEY!;
const ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN!;
const ACCESS_TOKEN_SECRET = process.env.TWITTER_ACCESS_TOKEN_SECRET!;

export interface Tweet {
  id: string;
  text: string;
  authorId: string;
  authorUsername: string;
  createdAt: string;
}

/**
 * Generate OAuth 1.0a Authorization header.
 */
function oauthHeader(
  method: string,
  url: string,
  params: Record<string, string> = {}
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: API_KEY,
    oauth_nonce: crypto.randomUUID().replace(/-/g, ''),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: ACCESS_TOKEN,
    oauth_version: '1.0',
  };

  // Combine all params for signature
  const allParams = { ...oauthParams, ...params };
  const paramString = Object.keys(allParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`)
    .join('&');

  const baseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
  const signingKey = `${encodeURIComponent(API_SECRET)}&${encodeURIComponent(ACCESS_TOKEN_SECRET)}`;

  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(baseString)
    .digest('base64');

  oauthParams['oauth_signature'] = signature;

  const header = Object.keys(oauthParams)
    .sort()
    .map(
      (k) => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`
    )
    .join(', ');

  return `OAuth ${header}`;
}

/**
 * Fetch recent mentions of @ack_onchain.
 */
export async function fetchMentions(
  sinceId: string | null
): Promise<{ tweets: Tweet[]; newestId: string | null }> {
  // Get our user ID (cached after first call)
  const userId = ACCESS_TOKEN.split('-')[0];

  const baseUrl = `https://api.x.com/2/users/${userId}/mentions`;
  const params: Record<string, string> = {
    'tweet.fields': 'created_at,author_id',
    expansions: 'author_id',
    'user.fields': 'username',
    max_results: '20',
  };

  if (sinceId) {
    params.since_id = sinceId;
  }

  const queryString = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');

  const url = `${baseUrl}?${queryString}`;

  const response = await fetch(url, {
    headers: {
      Authorization: oauthHeader('GET', baseUrl, params),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Mentions API error ${response.status}: ${text}`);
  }

  const data = await response.json();

  if (!data.data || data.data.length === 0) {
    return { tweets: [], newestId: null };
  }

  // Build author lookup
  const authorMap: Record<string, string> = {};
  if (data.includes?.users) {
    for (const user of data.includes.users) {
      authorMap[user.id] = user.username;
    }
  }

  const tweets: Tweet[] = data.data.map(
    (t: {
      id: string;
      text: string;
      author_id: string;
      created_at: string;
    }) => ({
      id: t.id,
      text: t.text,
      authorId: t.author_id,
      authorUsername: authorMap[t.author_id] || 'unknown',
      createdAt: t.created_at,
    })
  );

  return {
    tweets,
    newestId: data.meta?.newest_id || null,
  };
}

/**
 * Post a reply tweet.
 */
export async function postReply(
  inReplyToId: string,
  text: string,
  dryRun: boolean
): Promise<void> {
  if (dryRun) {
    console.log(`[dry-run] Reply to ${inReplyToId}: ${text}`);
    return;
  }

  const url = 'https://api.x.com/2/tweets';
  const body = JSON.stringify({
    text,
    reply: {
      in_reply_to_tweet_id: inReplyToId,
    },
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: oauthHeader('POST', url),
      'Content-Type': 'application/json',
    },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Tweet reply failed ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  console.log(`[reply] Posted tweet ${result.data?.id}`);
}
