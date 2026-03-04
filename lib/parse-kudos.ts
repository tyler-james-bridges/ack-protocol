/**
 * Client-side post parser — mirrors services/twitter-agent/src/parser.ts
 * Used for the dry-run preview on the home page.
 */

export interface ParsedKudos {
  targetHandle: string;
  sentiment: 'positive' | 'negative';
  amount: number;
  tipAmountUsd?: number; // parsed from $X.XX syntax
  category?: string;
  message?: string;
}

/** Clamp a parsed tip to $0.01-$100.00, returning undefined if out of range. */
function parseTipAmount(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const val = parseFloat(raw);
  if (!Number.isFinite(val) || val < 0.01) return undefined;
  return Math.min(val, 100);
}

export function parsePostPreview(text: string): ParsedKudos[] {
  const cleaned = text.replace(/@ack_onchain/gi, '').trim();
  const results: ParsedKudos[] = [];

  // Pattern 1: @handle ++/-- [$tip] [amount] [category] ["message"]
  const explicitRegex =
    /@(\w+)\s*(\+\+|--)\s*(?:\$(\d+(?:\.\d{1,2})?)\s*)?(\d+)?\s*(\w+)?\s*(?:"([^"]*)")?/g;
  let match: RegExpExecArray | null;

  while ((match = explicitRegex.exec(cleaned)) !== null) {
    const rawAmount = match[4] ? parseInt(match[4], 10) : 1;
    results.push({
      targetHandle: match[1],
      sentiment: match[2] === '++' ? 'positive' : 'negative',
      amount: Math.min(Math.max(rawAmount, 1), 100),
      tipAmountUsd: parseTipAmount(match[3]),
      category: match[5] || undefined,
      message: match[6] || undefined,
    });
  }
  if (results.length > 0) return results;

  // Pattern 1b: bare ++/-- (kudos to ACK itself)
  const hasOtherMentions = /@\w+/.test(cleaned);
  const bareMatch = cleaned.match(
    /^(\+\+|--)\s*(?:\$(\d+(?:\.\d{1,2})?)\s*)?(\d+)?\s*([\s\S]*)?$/
  );
  if (bareMatch && !hasOtherMentions) {
    const rawAmount = bareMatch[3] ? parseInt(bareMatch[3], 10) : 1;
    const rest = (bareMatch[4] || '').trim();
    const quotedMsg = rest.match(/"([^"]*)"/);
    results.push({
      targetHandle: 'ack_onchain',
      sentiment: bareMatch[1] === '++' ? 'positive' : 'negative',
      amount: Math.min(Math.max(rawAmount, 1), 100),
      tipAmountUsd: parseTipAmount(bareMatch[2]),
      message: quotedMsg ? quotedMsg[1] : rest || undefined,
    });
    return results;
  }

  // Pattern 2: ++/-- [$tip] @handle (reverse order)
  const reverseRegex =
    /(\+\+|--)\s*(?:\$(\d+(?:\.\d{1,2})?)\s*)?(\d+)?\s*@(\w+)\s*(\w+)?\s*(?:"([^"]*)")?/g;
  while ((match = reverseRegex.exec(cleaned)) !== null) {
    const rawAmount = match[3] ? parseInt(match[3], 10) : 1;
    results.push({
      targetHandle: match[4],
      sentiment: match[1] === '++' ? 'positive' : 'negative',
      amount: Math.min(Math.max(rawAmount, 1), 100),
      tipAmountUsd: parseTipAmount(match[2]),
      category: match[5] || undefined,
      message: match[6] || undefined,
    });
  }
  if (results.length > 0) return results;

  // Pattern 3: Natural language fallback (positive only)
  const mentions = cleaned.match(/@(\w+)/g);
  if (mentions && mentions.length > 0) {
    const positiveKeywords =
      /kudos|shoutout|props|thanks|thank|amazing|great|awesome|reliable|fast|helpful|crushing|killing it|solid|beast|goat/i;
    if (positiveKeywords.test(cleaned)) {
      const afterMention = cleaned
        .replace(/@\w+/g, '')
        .replace(/\b(for|to|is|has been|been)\b/gi, '')
        .trim();
      results.push({
        targetHandle: mentions[0].replace('@', ''),
        sentiment: 'positive',
        amount: 1,
        message: afterMention || undefined,
      });
    }
  }

  return results;
}
