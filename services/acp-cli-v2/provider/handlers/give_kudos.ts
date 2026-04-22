const VALID_CATEGORIES = [
  'reliability',
  'speed',
  'accuracy',
  'creativity',
  'collaboration',
  'security',
];

export interface GiveKudosInput {
  agentId: number;
  category?: string;
  message?: string;
}

export async function executeJob(input: GiveKudosInput): Promise<string> {
  const agentId = input.agentId;
  const category = (input.category ?? 'reliability').toLowerCase();
  const message = input.message ?? '';

  if (typeof agentId !== 'number') {
    return JSON.stringify({
      success: false,
      error: 'agentId is required and must be a number',
    });
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return JSON.stringify({
      success: false,
      error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
    });
  }

  const res = await fetch('https://ack-onchain.dev/api/kudos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, category, message }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return JSON.stringify({
      success: false,
      error: `Kudos submission failed (${res.status})`,
      detail: text.slice(0, 200),
      note: 'Kudos requires SIWA authentication. This offering queues the intent for the ACK relay wallet to execute.',
    });
  }

  const data: any = await res.json().catch(() => ({}));

  return JSON.stringify({
    success: true,
    agentId,
    category,
    message: message || '(bare kudos)',
    tx: data.txHash ?? data.tx ?? null,
    link: `https://8004scan.io/agents/abstract/${agentId}`,
    powered_by: 'ACK Protocol (ERC-8004)',
  });
}
