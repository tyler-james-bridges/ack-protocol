/**
 * Mock test for the ACK Twitter Agent parser + pipeline.
 * No real API calls — tests parsing and validation only.
 */

import { parseAllKudos, isValidKudos } from './parser.js';

const testTweets = [
  // Positive explicit
  `@ack_onchain @pudgypenguins ++`,
  `@ack_onchain @pudgypenguins ++ reliable`,
  `@ack_onchain @pudgypenguins ++ reliable "great agent, always delivers"`,
  `@ack_onchain ++ @pudgypenguins`,
  `@ack_onchain @pudgypenguins ++security`,

  // Negative explicit
  `@ack_onchain @pudgypenguins --`,
  `@ack_onchain @pudgypenguins -- unreliable`,
  `@ack_onchain @pudgypenguins -- slow "missed every deadline"`,
  `@ack_onchain -- @pudgypenguins`,

  // Mixed positive and negative
  `@ack_onchain @pudgypenguins ++ @BigHoss --`,
  `@ack_onchain @pudgypenguins ++ reliable @abstract -- slow @BigHoss ++ fast`,

  // Multiple agents (all positive)
  `@ack_onchain @pudgypenguins ++ @abstract ++ @BigHoss ++`,

  // Multiple agents (all negative)
  `@ack_onchain @pudgypenguins -- @abstract --`,

  // Natural language (positive only)
  `@ack_onchain shoutout to @pudgypenguins for being reliable`,
  `@ack_onchain @pudgypenguins is amazing, thanks for the help`,
  `@ack_onchain props to @pudgypenguins crushing it lately`,

  // No kudos intent
  `@ack_onchain hey can someone help me?`,
  `@ack_onchain @pudgypenguins sucks`, // no ++ or -- or positive keyword

  // Edge cases
  `@ack_onchain @x ++`,
  `@ack_onchain @thishandleiswaytoolongtobereal ++`,
  `@ack_onchain ++`,
  `@ack_onchain --`,
  `@ack_onchain @pudgypenguins ++ reliable "nested \\"quotes\\""`,

  // Self-kudos (blocked at runtime, not parser)
  `@ack_onchain @tmoney_145 ++`,

  // Kudos to ACK itself
  `@ack_onchain @ack_onchain ++`,
  `@ack_onchain ++ for setting up kudos onchain!!!`,
  `@ack_onchain -- terrible UX`,

  // Emoji
  `@ack_onchain @pudgypenguins ++ fire "🔥🔥🔥"`,
  `@ack_onchain @pudgypenguins -- buggy "💀"`,

  // Reply chain
  `@ack_onchain @pudgypenguins ++reliable "from a reply"`,
];

console.log('ACK Twitter Agent — Parser Mock Test\n');
console.log('='.repeat(60));

for (const text of testTweets) {
  const results = parseAllKudos(text);

  console.log(`\nTweet: ${text}`);
  if (results.length === 0) {
    console.log(`  → No kudos detected`);
  } else {
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const valid = isValidKudos(r);
      if (results.length > 1) console.log(`  [${i + 1}/${results.length}]`);
      console.log(`  → Target: @${r.targetHandle}`);
      console.log(`  → Sentiment: ${r.sentiment}`);
      console.log(`  → Category: ${r.category || '(none)'}`);
      console.log(`  → Message: ${r.message || '(none)'}`);
      console.log(`  → Explicit: ${r.isExplicit}`);
      console.log(`  → Valid: ${valid}`);
    }
  }
}

console.log('\n' + '='.repeat(60));
console.log('Done. All parsing is local — no API calls made.');
