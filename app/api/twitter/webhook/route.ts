import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { chain } from '@/config/chain';
import { CONTRACT_ADDRESS, ZERO_ADDRESS } from '@/config/contract';
import { KUDOS_CONTRACT_ABI } from '@/config/abi';
import crypto from 'crypto';

// SECURITY: Validate private key format at startup
function validatePrivateKey(key: string | undefined): `0x${string}` {
  if (!key) {
    throw new Error('WEBHOOK_PRIVATE_KEY environment variable is not configured');
  }

  // Must start with 0x
  if (!key.startsWith('0x')) {
    throw new Error('WEBHOOK_PRIVATE_KEY must start with 0x prefix');
  }

  // Must be 66 characters (0x + 64 hex chars for 32 bytes)
  if (key.length !== 66) {
    throw new Error('WEBHOOK_PRIVATE_KEY must be 32 bytes (66 characters including 0x prefix)');
  }

  // Must be valid hexadecimal
  const hexPart = key.slice(2);
  if (!/^[0-9a-fA-F]+$/.test(hexPart)) {
    throw new Error('WEBHOOK_PRIVATE_KEY contains invalid hexadecimal characters');
  }

  return key as `0x${string}`;
}

// SECURITY: Verify Twitter webhook signature using HMAC-SHA256
function verifyTwitterSignature(
  payload: string,
  signature: string | null,
  consumerSecret: string
): boolean {
  if (!signature) {
    return false;
  }

  // Twitter signature format: sha256=<base64-encoded-hmac>
  if (!signature.startsWith('sha256=')) {
    return false;
  }

  const providedSignature = signature.slice(7); // Remove 'sha256=' prefix

  const expectedSignature = crypto
    .createHmac('sha256', consumerSecret)
    .update(payload)
    .digest('base64');

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(providedSignature, 'base64'),
      Buffer.from(expectedSignature, 'base64')
    );
  } catch {
    // Buffer lengths don't match or invalid base64
    return false;
  }
}

interface TwitterWebhookPayload {
  tweet_create_events?: Array<{
    id_str: string;
    text: string;
    user: {
      screen_name: string;
    };
    entities?: {
      user_mentions?: Array<{
        screen_name: string;
      }>;
    };
  }>;
}

function parseKudosFromTweet(text: string): { giver: string; recipient: string } | null {
  const kudosPattern = /@(\w+)\s*\+\+/;
  const match = text.match(kudosPattern);

  if (match && match[1]) {
    return {
      giver: '',
      recipient: match[1]
    };
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Get raw body for signature verification before parsing
    const rawBody = await request.text();

    // SECURITY: Verify Twitter webhook signature
    const twitterSignature = request.headers.get('X-Twitter-Webhooks-Signature');
    const webhookSecret = process.env.TWITTER_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('TWITTER_WEBHOOK_SECRET is not configured');
      return NextResponse.json(
        { error: 'Webhook not properly configured' },
        { status: 500 }
      );
    }

    if (!verifyTwitterSignature(rawBody, twitterSignature, webhookSecret)) {
      console.error('Invalid Twitter webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // SECURITY: Validate private key format before any processing
    let validatedPrivateKey: `0x${string}`;
    try {
      validatedPrivateKey = validatePrivateKey(process.env.WEBHOOK_PRIVATE_KEY);
    } catch (error) {
      console.error('Private key validation failed:', error instanceof Error ? error.message : 'Unknown error');
      return NextResponse.json(
        { error: 'Webhook not properly configured' },
        { status: 500 }
      );
    }

    const payload: TwitterWebhookPayload = JSON.parse(rawBody);

    if (!payload.tweet_create_events || payload.tweet_create_events.length === 0) {
      return NextResponse.json({ status: 'ignored', reason: 'no tweet events' });
    }

    const processedTweets = [];

    for (const tweet of payload.tweet_create_events) {
      const kudos = parseKudosFromTweet(tweet.text);

      if (kudos) {
        kudos.giver = tweet.user.screen_name;

        try {
          const account = privateKeyToAccount(validatedPrivateKey);

          const walletClient = createWalletClient({
            account,
            chain: chain,
            transport: http()
          });

          const publicClient = createPublicClient({
            chain: chain,
            transport: http()
          });

          // Check if giver is registered
          const giverAddress = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: KUDOS_CONTRACT_ABI,
            functionName: 'handleToAddress',
            args: [kudos.giver]
          });

          // Skip if giver is not registered (zero address)
          if (giverAddress === ZERO_ADDRESS) {
            console.log(`Skipping kudos from unregistered user: @${kudos.giver}`);
            processedTweets.push({
              tweetId: tweet.id_str,
              giver: kudos.giver,
              recipient: kudos.recipient,
              status: 'skipped',
              reason: 'giver not registered'
            });
            continue;
          }

          const tweetUrl = `https://twitter.com/${kudos.giver}/status/${tweet.id_str}`;

          const { request: contractRequest } = await publicClient.simulateContract({
            address: CONTRACT_ADDRESS,
            abi: KUDOS_CONTRACT_ABI,
            functionName: 'giveKudos',
            args: [kudos.recipient, tweetUrl],
            account
          });

          const hash = await walletClient.writeContract(contractRequest);

          await publicClient.waitForTransactionReceipt({ hash });

          processedTweets.push({
            tweetId: tweet.id_str,
            giver: kudos.giver,
            recipient: kudos.recipient,
            transactionHash: hash,
            status: 'success'
          });
        } catch (error: unknown) {
          console.error('Error processing kudos:', error);
          processedTweets.push({
            tweetId: tweet.id_str,
            giver: kudos.giver,
            recipient: kudos.recipient,
            error: error instanceof Error ? error.message : 'Unknown error',
            status: 'failed'
          });
        }
      }
    }

    return NextResponse.json({
      status: 'processed',
      tweetsProcessed: processedTweets.length,
      results: processedTweets
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const crcToken = searchParams.get('crc_token');

  if (crcToken) {
    const hmac = crypto
      .createHmac('sha256', process.env.TWITTER_WEBHOOK_SECRET || '')
      .update(crcToken)
      .digest('base64');

    return NextResponse.json({
      response_token: `sha256=${hmac}`
    });
  }

  return NextResponse.json({ status: 'webhook endpoint active' });
}
