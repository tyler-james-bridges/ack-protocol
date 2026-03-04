/**
 * Client-side tweet parser — mirrors services/twitter-agent/src/parser.ts
 * Used for the dry-run preview on the home page.
 */

export interface ParsedKudos {
  targetHandle: string;
  sentiment: 'positive' | 'negative';
  amount: number;
  category?: string;
  message?: string;
}

export function parseTweetPreview(text: string): ParsedKudos[] {
  const cleaned = text.replace(/@ack_onchain/gi, '').trim();
  const results: ParsedKudos[] = [];

  // Pattern 1: @handle ++/-- [amount] [category] ["message"]
  const explicitRegex =
    /@(\w+)\s*(\+\+|--)\s*(\d+)?\s*(\w+)?\s*(?:"([^"]*)")?/g;
  let match: RegExpExecArray | null;

  while ((match = explicitRegex.exec(cleaned)) !== null) {
    const rawAmount = match[3] ? parseInt(match[3], 10) : 1;
    results.push({
      targetHandle: match[1],
      sentiment: match[2] === '++' ? 'positive' : 'negative',
      amount: Math.min(Math.max(rawAmount, 1), 100),
      category: match[4] || undefined,
      message: match[5] || undefined,
    });
  }
  if (results.length > 0) return results;

  // Pattern 1b: bare ++/-- (kudos to ACK itself)
  const hasOtherMentions = /@\w+/.test(cleaned);
  const bareMatch = cleaned.match(/^(\+\+|--)\s*(\d+)?\s*([\s\S]*)?$/);
  if (bareMatch && !hasOtherMentions) {
    const rawAmount = bareMatch[2] ? parseInt(bareMatch[2], 10) : 1;
    const rest = (bareMatch[3] || '').trim();
    const quotedMsg = rest.match(/"([^"]*)"/);
    results.push({
      targetHandle: 'ack_onchain',
      sentiment: bareMatch[1] === '++' ? 'positive' : 'negative',
      amount: Math.min(Math.max(rawAmount, 1), 100),
      message: quotedMsg ? quotedMsg[1] : rest || undefined,
    });
    return results;
  }

  // Pattern 2: ++/-- @handle (reverse order)
  const reverseRegex = /(\+\+|--)\s*(\d+)?\s*@(\w+)\s*(\w+)?\s*(?:"([^"]*)")?/g;
  while ((match = reverseRegex.exec(cleaned)) !== null) {
    const rawAmount = match[2] ? parseInt(match[2], 10) : 1;
    results.push({
      targetHandle: match[3],
      sentiment: match[1] === '++' ? 'positive' : 'negative',
      amount: Math.min(Math.max(rawAmount, 1), 100),
      category: match[4] || undefined,
      message: match[5] || undefined,
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
