import 'dotenv/config';
import crypto from 'node:crypto';

const API_KEY = process.env.TWITTER_API_KEY!;
const API_SECRET = process.env.TWITTER_API_SECRET_KEY!;
const ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN!;
const ACCESS_TOKEN_SECRET = process.env.TWITTER_ACCESS_TOKEN_SECRET!;

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
  const allParams = { ...oauthParams, ...params };
  const paramString = Object.keys(allParams)
    .sort()
    .map((k) => `${k}=${encodeURIComponent(allParams[k])}`)
    .join('&');
  const baseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
  const signingKey = `${encodeURIComponent(API_SECRET)}&${encodeURIComponent(ACCESS_TOKEN_SECRET)}`;
  oauthParams.oauth_signature = crypto
    .createHmac('sha1', signingKey)
    .update(baseString)
    .digest('base64');
  return (
    'OAuth ' +
    Object.keys(oauthParams)
      .sort()
      .map(
        (k) =>
          `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`
      )
      .join(', ')
  );
}

async function main() {
  const userId = ACCESS_TOKEN.split('-')[0];
  console.log('User ID:', userId);

  const url = `https://api.x.com/2/users/${userId}/mentions`;
  const res = await fetch(url, {
    headers: { Authorization: oauthHeader('GET', url) },
  });

  console.log('Status:', res.status);
  console.log('Rate limit:', res.headers.get('x-rate-limit-limit'));
  console.log('Remaining:', res.headers.get('x-rate-limit-remaining'));

  const body = await res.text();
  console.log('Body:', body);
}

main();
