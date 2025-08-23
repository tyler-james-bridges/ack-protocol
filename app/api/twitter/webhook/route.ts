import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { chain } from '@/config/chain';
import contractAbi from '@/artifacts/contracts/KudosTracker.sol/KudosTracker.json';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
const WEBHOOK_PRIVATE_KEY = process.env.WEBHOOK_PRIVATE_KEY as `0x${string}`;

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
    const payload: TwitterWebhookPayload = await request.json();
    
    if (!payload.tweet_create_events || payload.tweet_create_events.length === 0) {
      return NextResponse.json({ status: 'ignored', reason: 'no tweet events' });
    }

    const processedTweets = [];
    
    for (const tweet of payload.tweet_create_events) {
      const kudos = parseKudosFromTweet(tweet.text);
      
      if (kudos) {
        kudos.giver = tweet.user.screen_name;
        
        try {
          if (!WEBHOOK_PRIVATE_KEY) {
            console.error('Webhook private key not configured');
            continue;
          }

          const account = privateKeyToAccount(WEBHOOK_PRIVATE_KEY);
          
          const walletClient = createWalletClient({
            account,
            chain: chain,
            transport: http()
          });

          const publicClient = createPublicClient({
            chain: chain,
            transport: http()
          });

          const tweetUrl = `https://twitter.com/${kudos.giver}/status/${tweet.id_str}`;

          const { request } = await publicClient.simulateContract({
            address: CONTRACT_ADDRESS,
            abi: contractAbi.abi,
            functionName: 'giveKudos',
            args: [kudos.recipient, tweetUrl],
            account
          });

          const hash = await walletClient.writeContract(request);
          
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
    const crypto = await import('crypto');
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