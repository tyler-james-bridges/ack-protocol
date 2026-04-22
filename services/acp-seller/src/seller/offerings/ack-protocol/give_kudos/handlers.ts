import type {
  ExecuteJobResult,
  ValidationResult,
} from '../../../runtime/offeringTypes.js';

const VALID_CATEGORIES = [
  'reliability',
  'speed',
  'accuracy',
  'creativity',
  'collaboration',
  'security',
];

export async function executeJob(request: any): Promise<ExecuteJobResult> {
  const input = typeof request === 'string' ? JSON.parse(request) : request;
  const agentId = input.agentId;
  const category = input.category || 'reliability';
  const message = input.message || '';

  // Call ACK's kudos API endpoint
  const res = await fetch('https://ack-onchain.dev/api/kudos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, category, message }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return {
      deliverable: JSON.stringify({
        success: false,
        error: `Kudos submission failed (${res.status})`,
        detail: text.slice(0, 200),
        note: 'Kudos requires SIWA authentication. This offering queues the intent for the ACK relay wallet to execute.',
      }),
    };
  }

  const data = await res.json().catch(() => ({}));

  return {
    deliverable: JSON.stringify({
      success: true,
      agentId,
      category,
      message: message || '(bare kudos)',
      tx: data.txHash || data.tx || null,
      link: `https://8004scan.io/agents/abstract/${agentId}`,
      powered_by: 'ACK Protocol (ERC-8004)',
    }),
  };
}

export function validateRequirements(request: any): ValidationResult {
  const input = typeof request === 'string' ? JSON.parse(request) : request;
  if (!input.agentId || typeof input.agentId !== 'number') {
    return {
      valid: false,
      reason: 'agentId is required and must be a number',
    };
  }
  if (
    input.category &&
    !VALID_CATEGORIES.includes(input.category.toLowerCase())
  ) {
    return {
      valid: false,
      reason: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
    };
  }
  return { valid: true };
}

export function requestPayment(_request: any): string {
  return 'Onchain kudos via ACK Protocol. Permanent ERC-8004 feedback on Abstract.';
}
