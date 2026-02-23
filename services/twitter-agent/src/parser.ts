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

export interface KudosCommand {
  targetHandle: string;
  category?: string;
  message?: string;
  isExplicit: boolean; // true if ++ or -- was used
  sentiment: 'positive' | 'negative';
}

/**
 * Parse all kudos commands from tweet text.
 * Returns empty array if no kudos intent detected.
 */
export function parseAllKudos(text: string): KudosCommand[] {
  const cleaned = text.replace(/@ack_onchain/i, '').trim();
  const results: KudosCommand[] = [];

  // Pattern 1: All explicit @handle ++/-- [category] ["message"] matches
  const explicitRegex = /@(\w+)\s*(\+\+|--)\s*(\w+)?\s*(?:"([^"]*)")?/g;
  let match: RegExpExecArray | null;

  while ((match = explicitRegex.exec(cleaned)) !== null) {
    results.push({
      targetHandle: match[1],
      sentiment: match[2] === '++' ? 'positive' : 'negative',
      category: match[3] || undefined,
      message: match[4] || undefined,
      isExplicit: true,
    });
  }

  if (results.length > 0) return results;

  // Pattern 1b: ++ or -- with no @handle means kudos to ACK itself
  // e.g. "@ack_onchain ++ for setting up kudos onchain!!!"
  const hasOtherMentions = /@\w+/.test(cleaned);
  const bareMatch = cleaned.match(/^(\+\+|--)\s*(.*)?$/s);
  if (bareMatch && !hasOtherMentions) {
    const rest = (bareMatch[2] || '').trim();
    // Try to extract a quoted message
    const quotedMsg = rest.match(/"([^"]*)"/);
    // Everything else is treated as a freeform message
    const message = quotedMsg ? quotedMsg[1] : rest || undefined;
    results.push({
      targetHandle: 'ack_onchain',
      sentiment: bareMatch[1] === '++' ? 'positive' : 'negative',
      category: undefined,
      message,
      isExplicit: true,
    });
    return results;
  }

  // Pattern 2: ++/-- @handle (reverse order)
  const reverseRegex = /(\+\+|--)\s*@(\w+)\s*(\w+)?\s*(?:"([^"]*)")?/g;

  while ((match = reverseRegex.exec(cleaned)) !== null) {
    results.push({
      targetHandle: match[2],
      sentiment: match[1] === '++' ? 'positive' : 'negative',
      category: match[3] || undefined,
      message: match[4] || undefined,
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
