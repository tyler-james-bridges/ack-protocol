/**
 * Parse a tweet mentioning @ack_onchain into kudos action(s).
 *
 * Supported formats:
 *   @ack_onchain @BigHoss ++
 *   @ack_onchain @BigHoss ++ reliable
 *   @ack_onchain @BigHoss ++ reliable "great agent"
 *   @ack_onchain @BigHoss --
 *   @ack_onchain @BigHoss -- unreliable "missed deadlines"
 *   @ack_onchain @pudgypenguins ++ @abstract ++    (multiple agents)
 *   @ack_onchain @pudgypenguins ++ @BigHoss --     (mixed positive/negative)
 *   @ack_onchain shoutout to @BigHoss for being reliable (natural language fallback)
 */

/**
 * Parse a claim verification code from tweet text.
 * Returns the code (e.g. "ack-claim-a1b2c3") or null.
 */
export function parseClaimCode(text: string): string | null {
  const match = text.match(/ack-claim-([a-f0-9]{6})/);
  return match ? `ack-claim-${match[1]}` : null;
}

export interface KudosCommand {
  targetHandle: string;
  category?: string;
  message?: string;
  amount: number; // default 1, or explicit (e.g. ++ 5)
  tipAmountUsd?: number; // parsed from $X.XX syntax
  isExplicit: boolean; // true if ++ or -- was used
  sentiment: 'positive' | 'negative';
}

/** Clamp a parsed tip to $0.01-$100.00, returning undefined if out of range. */
function parseTipAmount(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const val = parseFloat(raw);
  if (!Number.isFinite(val) || val < 0.01) return undefined;
  return Math.min(val, 100);
}

/**
 * Parse all kudos commands from tweet text.
 * Returns empty array if no kudos intent detected.
 */
export function parseAllKudos(text: string): KudosCommand[] {
  const cleaned = text.replace(/@ack_onchain/i, '').trim();
  const results: KudosCommand[] = [];

  // Pattern 1: All explicit @handle ++/-- [$tip] [number] [category] ["message"] matches
  // The $ prefix distinguishes tips from kudos amounts: ++ 5 = 5 kudos, ++ $5 = $5 tip
  const explicitRegex =
    /@(\w+)\s*(\+\+|--)\s*(?:\$(\d+(?:\.\d{1,2})?)\s*)?(\d+)?\s*(\w+)?\s*(?:"([^"]*)")?/g;
  let match: RegExpExecArray | null;

  while ((match = explicitRegex.exec(cleaned)) !== null) {
    const rawAmount = match[4] ? parseInt(match[4], 10) : 1;
    const amount = Math.min(Math.max(rawAmount, 1), 100); // clamp 1-100
    results.push({
      targetHandle: match[1],
      sentiment: match[2] === '++' ? 'positive' : 'negative',
      amount,
      tipAmountUsd: parseTipAmount(match[3]),
      category: match[5] || undefined,
      message: match[6] || undefined,
      isExplicit: true,
    });
  }

  if (results.length > 0) return results;

  // Pattern 1b: ++ or -- with no @handle means kudos to ACK itself
  // e.g. "@ack_onchain ++ for setting up kudos onchain!!!"
  const hasOtherMentions = /@\w+/.test(cleaned);
  const bareMatch = cleaned.match(
    /^(\+\+|--)\s*(?:\$(\d+(?:\.\d{1,2})?)\s*)?(\d+)?\s*(.*)?$/s
  );
  if (bareMatch && !hasOtherMentions) {
    const rawAmount = bareMatch[3] ? parseInt(bareMatch[3], 10) : 1;
    const amount = Math.min(Math.max(rawAmount, 1), 100);
    const rest = (bareMatch[4] || '').trim();
    // Try to extract a quoted message
    const quotedMsg = rest.match(/"([^"]*)"/);
    // Everything else is treated as a freeform message
    const message = quotedMsg ? quotedMsg[1] : rest || undefined;
    results.push({
      targetHandle: 'ack_onchain',
      sentiment: bareMatch[1] === '++' ? 'positive' : 'negative',
      amount,
      tipAmountUsd: parseTipAmount(bareMatch[2]),
      category: undefined,
      message,
      isExplicit: true,
    });
    return results;
  }

  // Pattern 2: ++/-- [$tip] [number] @handle (reverse order)
  const reverseRegex =
    /(\+\+|--)\s*(?:\$(\d+(?:\.\d{1,2})?)\s*)?(\d+)?\s*@(\w+)\s*(\w+)?\s*(?:"([^"]*)")?/g;

  while ((match = reverseRegex.exec(cleaned)) !== null) {
    const rawAmount = match[3] ? parseInt(match[3], 10) : 1;
    const amount = Math.min(Math.max(rawAmount, 1), 100);
    results.push({
      targetHandle: match[4],
      sentiment: match[1] === '++' ? 'positive' : 'negative',
      amount,
      tipAmountUsd: parseTipAmount(match[2]),
      category: match[5] || undefined,
      message: match[6] || undefined,
      isExplicit: true,
    });
  }

  if (results.length > 0) return results;

  // Pattern 3: Natural language fallback (single target only, positive only)
  const mentions = cleaned.match(/@(\w+)/g);
  if (mentions && mentions.length > 0) {
    const targetMention = mentions[0].replace('@', '');

    const positiveKeywords =
      /kudos|shoutout|props|thanks|thank|amazing|great|awesome|reliable|fast|helpful|crushing|killing it|solid|beast|goat/i;

    if (positiveKeywords.test(cleaned)) {
      const afterMention = cleaned
        .replace(/@\w+/g, '')
        .replace(/\b(for|to|is|has been|been)\b/gi, '')
        .trim();

      results.push({
        targetHandle: targetMention,
        category: undefined,
        message: afterMention || undefined,
        amount: 1,
        isExplicit: false,
        sentiment: 'positive',
      });
    }
  }

  return results;
}

/**
 * Try to parse a single kudos command from tweet text.
 * Returns null if no kudos intent detected.
 * @deprecated Use parseAllKudos() for multi-agent support.
 */
export function parseKudos(text: string): KudosCommand | null {
  const all = parseAllKudos(text);
  return all.length > 0 ? all[0] : null;
}

/**
 * Validate that a parsed kudos command has enough info to submit.
 */
export function isValidKudos(cmd: KudosCommand): boolean {
  return cmd.targetHandle.length > 0 && cmd.targetHandle.length <= 15;
}
