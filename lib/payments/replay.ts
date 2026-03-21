const seen = new Set<string>();
const fifo: string[] = [];
const MAX = 20000;

export function isProofReplayed(proofId: string): boolean {
  return seen.has(proofId);
}

export function markProofUsed(proofId: string): void {
  if (!proofId || seen.has(proofId)) return;
  seen.add(proofId);
  fifo.push(proofId);
  while (fifo.length > MAX) {
    const oldest = fifo.shift();
    if (oldest) seen.delete(oldest);
  }
}

export function parseXPaymentProofId(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const m = /^v1:\d+(?:\.\d{1,6})?:(0x[a-fA-F0-9]{64})$/.exec(trimmed);
  return m ? m[1] : null;
}
