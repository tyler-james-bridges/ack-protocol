/**
 * ACK Twitter Agent
 *
 * Monitors @ack_onchain mentions on X, parses kudos commands,
 * submits them onchain, and replies with tx confirmation.
 *
 * Usage:
 *   npm start        # production
 *   npm run dev      # watch mode
 */

import 'dotenv/config';
import { parseAllKudos, isValidKudos } from './parser.js';
import {
  submitKudos,
  resolveHandleToAgentId,
  getAgentName,
} from './onchain.js';
import { postReply, fetchMentions, type Tweet } from './twitter.js';

const POLL_INTERVAL = parseInt(process.env.TWITTER_POLL_INTERVAL || '120', 10);
const DRY_RUN = process.env.TWITTER_DRY_RUN === 'true';

let lastSeenId: string | null = null;
const processedIds = new Set<string>();

async function processMention(tweet: Tweet): Promise<void> {
  if (processedIds.has(tweet.id)) return;
  processedIds.add(tweet.id);

  console.log(`[mention] @${tweet.authorUsername}: ${tweet.text}`);

  // Parse kudos from tweet
  const allKudos = parseAllKudos(tweet.text);
  const validKudos = allKudos.filter(isValidKudos);

  if (validKudos.length === 0) {
    console.log(`[skip] No valid kudos command found`);
    return;
  }

  const results: string[] = [];

  for (const kudos of validKudos) {
    // Block self-kudos
    if (
      kudos.targetHandle.toLowerCase() === tweet.authorUsername.toLowerCase()
    ) {
      console.log(
        `[skip] Self-kudos blocked: @${tweet.authorUsername} tried to kudos themselves`
      );
      continue;
    }

    console.log(
      `[kudos] Target: @${kudos.targetHandle}, Category: ${kudos.category || 'none'}, Message: ${kudos.message || 'none'}, Explicit: ${kudos.isExplicit}`
    );

    // Resolve twitter handle to agent ID
    const agentId = await resolveHandleToAgentId(kudos.targetHandle);

    if (!agentId) {
      console.log(
        `[error] Could not resolve @${kudos.targetHandle} to an agent`
      );
      results.push(`Could not find agent for @${kudos.targetHandle}`);
      continue;
    }

    const agentName = (await getAgentName(agentId)) || kudos.targetHandle;

    if (DRY_RUN) {
      console.log(
        `[dry-run] Would submit kudos: agent=${agentName} (#${agentId}), category=${kudos.category || 'kudos'}, message=${kudos.message || ''}`
      );
      results.push(`[DRY RUN] Kudos for ${agentName}!`);
      continue;
    }

    // Submit onchain
    console.log(`[submit] Sending kudos onchain for agent #${agentId}...`);
    const result = await submitKudos({
      agentId,
      category: kudos.category || 'kudos',
      message: kudos.message || '',
      from: tweet.authorUsername,
    });

    if (result.success) {
      const txUrl = `https://abscan.org/tx/${result.txHash}`;
      console.log(`[success] Tx: ${txUrl}`);
      results.push(
        `Kudos sent to ${agentName}!${kudos.category ? ` (${kudos.category})` : ''} Tx: ${txUrl}`
      );
    } else {
      console.error(`[error] Onchain submission failed: ${result.error}`);
      results.push(`Failed to send kudos to ${agentName}`);
    }
  }

  // Send a single consolidated reply
  if (results.length > 0) {
    const replyText =
      results.length === 1
        ? `${results[0]}\n\nGive kudos: ack-onchain.dev/kudos`
        : `${results.join('\n')}\n\nGive kudos: ack-onchain.dev/kudos`;
    await postReply(tweet.id, replyText, DRY_RUN);
  } else if (allKudos.length > 0) {
    // All were self-kudos
    await postReply(
      tweet.id,
      `Can't give kudos to yourself! Try recognizing another agent instead.`,
      DRY_RUN
    );
  }
}

async function pollLoop(): Promise<void> {
  console.log(`[poll] Checking mentions...${DRY_RUN ? ' (DRY RUN)' : ''}`);

  try {
    const { tweets, newestId } = await fetchMentions(lastSeenId);

    if (newestId) {
      lastSeenId = newestId;
    }

    if (tweets.length === 0) {
      console.log('[poll] No new mentions');
      return;
    }

    console.log(`[poll] Found ${tweets.length} new mention(s)`);

    for (const tweet of tweets) {
      await processMention(tweet);
    }
  } catch (error) {
    console.error('[poll] Error:', error);
  }
}

async function main(): Promise<void> {
  console.log('='.repeat(50));
  console.log('ACK Twitter Agent');
  console.log('='.repeat(50));
  console.log(`Poll interval: ${POLL_INTERVAL}s`);
  console.log(`Dry run: ${DRY_RUN}`);
  console.log('='.repeat(50));

  // Initial poll
  await pollLoop();

  // Start polling loop
  setInterval(pollLoop, POLL_INTERVAL * 1000);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
