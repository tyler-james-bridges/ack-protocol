import 'dotenv/config';
import crypto from 'node:crypto';

const API_KEY = process.env.TWITTER_API_KEY!;
const API_SECRET = process.env.TWITTER_API_SECRET_KEY!;
const ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN!;
const ACCESS_TOKEN_SECRET = process.env.TWITTER_ACCESS_TOKEN_SECRET!;

const url = 'https://api.x.com/2/users/me';
const oauthParams: Record<string, string> = {
  oauth_consumer_key: API_KEY,
  oauth_nonce: crypto.randomUUID().replace(/-/g, ''),
  oauth_signature_method: 'HMAC-SHA1',
  oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
  oauth_token: ACCESS_TOKEN,
  oauth_version: '1.0',
};
const paramString = Object.keys(oauthParams).sort().map(k => `${k}=${encodeURIComponent(oauthParams[k])}`).join('&');
const baseString = `GET&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
const signingKey = `${encodeURIComponent(API_SECRET)}&${encodeURIComponent(ACCESS_TOKEN_SECRET)}`;
oauthParams.oauth_signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
const header = 'OAuth ' + Object.keys(oauthParams).sort().map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`).join(', ');

async function main() {
  const res = await fetch(url, { headers: { Authorization: header } });
  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Response:', JSON.stringify(data, null, 2));
}

main();
