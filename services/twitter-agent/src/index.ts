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
import { parseAllKudos, isValidKudos, parseClaimCode } from './parser.js';
import {
  submitKudos,
  submitClaim,
  resolveAgentTarget,
  resolveHandleTarget,
  getAgentName,
  ensureHandleRegistered,
  getActiveChainLabel,
  getDefaultChainId,
  getExplorerTxUrl,
  getProxyAgentId,
  getTwitterChainConfig,
} from './onchain.js';
import { postReply, fetchMentions, type Tweet } from './twitter.js';

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const POLL_INTERVAL = parseInt(process.env.TWITTER_POLL_INTERVAL || '120', 10);
const DRY_RUN = process.env.TWITTER_DRY_RUN === 'true';

interface ProcessResult {
  success: boolean;
  agentName: string;
  sentiment: 'positive' | 'negative';
  amount: number;
  from?: string;
  permalink?: string;
  txHash?: string;
  tipUrl?: string;
  chainId?: number;
}

const STATE_FILE = join(
  process.env.HOME || '/tmp',
  '.ack-twitter-agent',
  'state.json'
);

function loadState(): { lastSeenId: string | null } {
  try {
    const data = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
    return { lastSeenId: data.lastSeenId || null };
  } catch {
    return { lastSeenId: null };
  }
}

function saveState(id: string): void {
  try {
    mkdirSync(dirname(STATE_FILE), { recursive: true });
    writeFileSync(STATE_FILE, JSON.stringify({ lastSeenId: id }));
  } catch (err) {
    console.error('[state] Failed to save:', err);
  }
}

let lastSeenId: string | null = loadState().lastSeenId;
const processedIds = new Set<string>();

if (lastSeenId) {
  console.log(`[init] Resuming from lastSeenId: ${lastSeenId}`);
}

async function processMention(tweet: Tweet): Promise<void> {
  if (processedIds.has(tweet.id)) return;
  processedIds.add(tweet.id);

  console.log(`[mention] @${tweet.authorUsername}: ${tweet.text}`);

  // Check for claim verification tweet before kudos parsing
  const claimCode = parseClaimCode(tweet.text);
  if (claimCode) {
    console.log(
      `[claim] Detected claim code: ${claimCode} from @${tweet.authorUsername}`
    );
    try {
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const res = await fetch(
        `${appUrl}/api/claim?handle=${encodeURIComponent(tweet.authorUsername)}&full=true`
      );
      const data = await res.json();

      if (
        data.status === 'pending' &&
        data.challenge === claimCode &&
        data.walletAddress &&
        data.agentId
      ) {
        const targetChainId = getDefaultChainId();
        const result = await submitClaim(
          tweet.authorUsername,
          data.walletAddress,
          data.agentId,
          targetChainId
        );

        if (result.success) {
          await fetch(`${appUrl}/api/claim`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              handle: tweet.authorUsername,
              txHash: result.txHash,
            }),
          });

          console.log(
            `[claim] Success! @${tweet.authorUsername} linked to agent #${data.agentId}`
          );
          await postReply(
            tweet.id,
            `Claimed! @${tweet.authorUsername} is now linked to agent #${data.agentId}\n\n${getExplorerTxUrl(result.txHash || '', targetChainId)}`,
            DRY_RUN
          );
        } else {
          console.error(`[claim] Onchain submission failed: ${result.error}`);
          await postReply(
            tweet.id,
            `Claim failed - please try again. Error: ${result.error?.slice(0, 100)}`,
            DRY_RUN
          );
        }
      } else {
        console.log(
          `[claim] No matching pending challenge for @${tweet.authorUsername}`
        );
      }
    } catch (error) {
      console.error('[claim] Error processing claim:', error);
    }
    return;
  }

  // Parse kudos from tweet — only accept explicit ++/-- syntax
  const allKudos = parseAllKudos(tweet.text);
  const validKudos = allKudos.filter((k) => isValidKudos(k) && k.isExplicit);

  if (validKudos.length === 0) {
    console.log(`[skip] No valid kudos command found`);
    return;
  }

  const results: ProcessResult[] = [];

  for (const kudos of validKudos) {
    let targetChainId = kudos.targetChainId ?? getDefaultChainId();
    let targetChain = getTwitterChainConfig(targetChainId);

    // Block self-kudos for handle-targeted posts
    if (
      kudos.targetHandle &&
      kudos.targetHandle.toLowerCase() === tweet.authorUsername.toLowerCase()
    ) {
      console.log(
        `[skip] Self-kudos blocked: @${tweet.authorUsername} tried to kudos themselves`
      );
      continue;
    }

    const targetLabel =
      kudos.targetAgentId !== undefined
        ? `#${kudos.targetAgentId}`
        : `@${kudos.targetHandle}`;

    console.log(
      `[kudos] Target: ${targetLabel}, Sentiment: ${kudos.sentiment}, Category: ${kudos.category || 'none'}, Message: ${kudos.message || 'none'}, Explicit: ${kudos.isExplicit}`
    );

    // Resolve target in priority order: explicit agentId, then handle
    let agentId: number | null = null;
    if (typeof kudos.targetAgentId === 'number') {
      const resolved = await resolveAgentTarget(
        kudos.targetAgentId,
        kudos.targetChainId
      );
      if (!resolved) {
        const chainScope = kudos.targetChainId
          ? ` on ${targetChain.name}`
          : ' on supported chains';
        console.log(
          `[skip] Agent #${kudos.targetAgentId} not found${chainScope}`
        );
        results.push({
          success: false,
          agentName: `Agent #${kudos.targetAgentId}`,
          sentiment: kudos.sentiment,
          amount: kudos.amount,
        });
        continue;
      }
      agentId = resolved.agentId;
      targetChainId = resolved.chainId;
      targetChain = getTwitterChainConfig(targetChainId);
    } else if (kudos.targetHandle) {
      const resolved = await resolveHandleTarget(
        kudos.targetHandle,
        kudos.targetChainId
      );
      if (resolved) {
        agentId = resolved.agentId;
        targetChainId = resolved.chainId;
        targetChain = getTwitterChainConfig(targetChainId);
      }
    }

    if (!agentId && kudos.targetHandle) {
      // Not an 8004 agent - register in HandleRegistry and record feedback there
      console.log(
        `[handle] @${kudos.targetHandle} not an 8004 agent, registering in HandleRegistry`
      );

      const handleResult = await ensureHandleRegistered(
        kudos.targetHandle,
        targetChainId
      );
      if (handleResult.registered) {
        console.log(
          `[handle] Registered @${kudos.targetHandle} (tx: ${handleResult.txHash})`
        );
      }

      // Submit kudos against configured ACK proxy agent, with handle in tag2
      const proxyAgentId = getProxyAgentId(targetChainId);
      if (!proxyAgentId) {
        console.log(
          `[skip] No proxy agent configured for ${targetChain.name}; cannot proxy @${kudos.targetHandle}`
        );
        results.push({
          success: false,
          agentName: `@${kudos.targetHandle}`,
          sentiment: kudos.sentiment,
          amount: kudos.amount,
        });
        continue;
      }

      const proxyResult = await submitKudos({
        agentId: proxyAgentId,
        category: kudos.category || 'kudos',
        message: kudos.message || '',
        from: tweet.authorUsername,
        sentiment: kudos.sentiment,
        amount: kudos.amount,
        proxyHandle: kudos.targetHandle,
        chainId: targetChainId,
      });

      if (proxyResult.success) {
        const permalink = `https://ack-onchain.dev/kudos/${proxyResult.txHash}`;
        console.log(
          `[success] Proxy kudos for @${kudos.targetHandle}: ${proxyResult.txHash}`
        );
        results.push({
          success: true,
          agentName: `@${kudos.targetHandle}`,
          sentiment: kudos.sentiment,
          amount: kudos.amount,
          from: tweet.authorUsername,
          permalink,
          txHash: proxyResult.txHash,
          chainId: targetChainId,
        });
      } else {
        console.error(`[error] Proxy kudos failed: ${proxyResult.error}`);
        results.push({
          success: false,
          agentName: `@${kudos.targetHandle}`,
          sentiment: kudos.sentiment,
          amount: kudos.amount,
        });
      }
      continue;
    }

    const agentName =
      (await getAgentName(agentId, targetChainId)) || `Agent #${agentId}`;

    if (DRY_RUN) {
      console.log(
        `[dry-run] Would submit ${kudos.sentiment} feedback: agent=${agentName} (#${agentId}), category=${kudos.category || 'kudos'}, message=${kudos.message || ''}`
      );
      results.push({
        success: true,
        agentName,
        sentiment: kudos.sentiment,
        amount: kudos.amount,
        from: tweet.authorUsername,
        permalink: `https://ack-onchain.dev/kudos/dry-run`,
        txHash: 'dry-run',
        chainId: targetChainId,
      });
      continue;
    }

    // Submit onchain
    console.log(
      `[submit] Sending kudos on ${targetChain.name} for agent #${agentId}...`
    );
    const result = await submitKudos({
      agentId,
      category: kudos.category || 'kudos',
      message: kudos.message || '',
      from: tweet.authorUsername,
      sentiment: kudos.sentiment,
      amount: kudos.amount,
      chainId: targetChainId,
    });

    if (result.success) {
      const permalink = `https://ack-onchain.dev/kudos/${result.txHash}`;
      console.log(`[success] Tx: ${result.txHash}`);

      // Create tip if $X amount was included
      let tipUrl: string | undefined;
      if (kudos.tipAmountUsd && kudos.tipAmountUsd > 0) {
        try {
          const appUrl = process.env.APP_URL || 'https://ack-onchain.dev';
          const tipRes = await fetch(`${appUrl}/api/tips`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentId,
              fromAddress: '0x0000000000000000000000000000000000000000',
              amountUsd: kudos.tipAmountUsd,
              kudosTxHash: result.txHash,
              chainId: targetChainId,
            }),
          });
          if (tipRes.ok) {
            const tipData = await tipRes.json();
            tipUrl = `https://ack-onchain.dev/tip/${tipData.tipId}`;
            console.log(
              `[tip] Created $${kudos.tipAmountUsd} tip on ${targetChain.name}: ${tipUrl}`
            );
          } else {
            const err = await tipRes.text().catch(() => '');
            console.error(
              `[tip] Failed to create tip on ${targetChain.name}: ${tipRes.status}${err ? ` ${err.slice(0, 200)}` : ''}`
            );
          }
        } catch (tipErr) {
          console.error(`[tip] Error creating tip:`, tipErr);
        }
      }

      results.push({
        success: true,
        agentName,
        sentiment: kudos.sentiment,
        amount: kudos.amount,
        from: tweet.authorUsername,
        permalink,
        txHash: result.txHash,
        tipUrl,
        chainId: targetChainId,
      });
    } else {
      console.error(`[error] Onchain submission failed: ${result.error}`);
      results.push({
        success: false,
        amount: kudos.amount,
        agentName,
        sentiment: kudos.sentiment,
      });
    }
  }

  // Send a single consolidated reply
  if (results.length > 0) {
    const successes = results.filter((r) => r.success);
    const failures = results.filter((r) => !r.success);

    let replyText = '';

    if (successes.length > 0) {
      const lines = successes.map((r) => {
        const sign = r.sentiment === 'negative' ? '-' : '+';
        return `${sign}${r.amount} ${r.agentName}`;
      });
      // Find the original kudos message if any
      const originalKudos = allKudos.find((k) => k.message);
      const msgLine =
        originalKudos && originalKudos.message
          ? `\n\n"${originalKudos.message.slice(0, 120)}"`
          : '';
      const txLine = successes
        .filter((r) => r.txHash)
        .map((r) => getExplorerTxUrl(r.txHash as string, r.chainId))
        .join('\n');
      const tipLine = successes
        .filter((r) => r.tipUrl)
        .map((r) => `tip: ${r.tipUrl}`)
        .join('\n');
      replyText = `${lines.join('\n')}${msgLine}\n\n${txLine}${tipLine ? '\n' + tipLine : ''}`;
    }

    if (failures.length > 0 && successes.length === 0) {
      replyText =
        "couldn't record this onchain. agent may not be registered yet.\n\nack-onchain.dev/register";
    } else if (failures.length > 0) {
      replyText += '\n\nsome entries failed. try ack-onchain.dev/kudos';
    }

    await postReply(tweet.id, replyText, DRY_RUN);
  } else if (allKudos.length > 0) {
    await postReply(tweet.id, "can't give kudos to yourself", DRY_RUN);
  }
}

async function pollLoop(): Promise<void> {
  console.log(`[poll] Checking mentions...${DRY_RUN ? ' (DRY RUN)' : ''}`);

  try {
    const { tweets, newestId } = await fetchMentions(lastSeenId);

    if (newestId) {
      lastSeenId = newestId;
      saveState(newestId);
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  console.log('='.repeat(50));
  console.log('ACK Twitter Agent');
  console.log('='.repeat(50));
  console.log(`Poll interval: ${POLL_INTERVAL}s`);
  console.log(`Dry run: ${DRY_RUN}`);
  console.log(`Default chain: ${getActiveChainLabel()}`);
  console.log('='.repeat(50));

  // Sequential polling loop — waits for each poll to finish before sleeping.
  // Prevents overlapping polls when onchain submissions are slow.
  while (true) {
    await pollLoop();
    await sleep(POLL_INTERVAL * 1000);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
