/**
 * Readable copy for x402 facilitator rejections.
 *
 * The pay route puts the facilitator reason (for example
 * `address_not_registered`) on the 402 JSON body. Tip screens map that code
 * to a sentence. Unrecognized sentences are shown as-is so wallet errors stay
 * intact.
 */

const REJECTION_MESSAGES: Record<string, string> = {
  address_not_registered:
    "This agent's owner is not registered with the payment facilitator, so the tip could not be settled.",
  insufficient_funds: 'Your wallet does not have enough USDC for this tip.',
  invalid_exact_evm_insufficient_balance:
    'Your wallet does not have enough USDC for this tip.',
  invalid_exact_evm_payload_signature:
    'The payment signature was rejected. Try the tip again.',
  invalid_exact_evm_payload_authorization_valid_before:
    'This payment authorization expired. Try the tip again.',
  invalid_exact_evm_payload_authorization_valid_after:
    'This payment authorization is not active yet. Try the tip again.',
  invalid_exact_evm_payload_authorization_value_mismatch:
    'The signed amount does not match this tip. Try the tip again.',
  invalid_exact_evm_payload_recipient_mismatch:
    "The signed recipient does not match this agent's owner. Try the tip again.",
  unexpected_verify_error:
    'The payment facilitator could not verify this tip. Try again.',
  unexpected_settle_error:
    'The payment facilitator could not settle this tip. Try again.',
  invalid_network: 'This payment network is not supported for this tip.',
  invalid_scheme: 'This payment method is not supported for this tip.',
  unsupported_scheme: 'This payment method is not supported for this tip.',
};

const CHALLENGE_ERRORS = new Set([
  'payment required',
  'payment-signature header is required',
]);

export function isX402ChallengeError(reason: string): boolean {
  return CHALLENGE_ERRORS.has(reason.trim().toLowerCase());
}

function messageForCode(code: string): string | undefined {
  return REJECTION_MESSAGES[code];
}

/**
 * Turn a facilitator reason, or an already-readable error, into UI copy.
 */
export function x402RejectionMessage(reason: string): string {
  const trimmed = reason.trim();
  if (!trimmed) return 'The payment facilitator rejected this tip. Try again.';

  const exact = messageForCode(trimmed);
  if (exact) return exact;

  const embedded = trimmed.match(/[a-z][a-z0-9_]{3,}/g) ?? [];
  for (const token of embedded) {
    const message = messageForCode(token);
    if (message) return message;
  }

  if (/^payment failed \(\d+\)$/i.test(trimmed)) {
    return 'The payment facilitator rejected this tip. Try again.';
  }

  if (/^[a-z0-9_]+$/.test(trimmed)) {
    return `Payment failed: ${trimmed.replaceAll('_', ' ')}.`;
  }

  return trimmed;
}

function stringField(
  value: Record<string, unknown>,
  key: string
): string | null {
  const field = value[key];
  if (typeof field !== 'string') return null;
  const trimmed = field.trim();
  return trimmed ? trimmed : null;
}

function decodeHeaderJson(
  value: string | null
): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const json = Buffer.from(padded, 'base64').toString('utf8');
    const parsed = JSON.parse(json) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Read the facilitator reason hidden in an x402 402 header.
 *
 * Verify failures put `invalidReason` on `PAYMENT-REQUIRED.error`.
 * Settle failures put `errorReason` on `PAYMENT-RESPONSE` and leave the body
 * empty. The unpaid challenge text is ignored.
 */
export function facilitatorRejectionReason(headers: {
  get(name: string): string | null;
}): string | null {
  const settled = decodeHeaderJson(
    headers.get('payment-response') ?? headers.get('x-payment-response')
  );
  if (settled?.success === false) {
    const reason = stringField(settled, 'errorReason');
    if (reason) return reason;
  }

  const required = decodeHeaderJson(headers.get('payment-required'));
  if (!required) return null;
  const reason = stringField(required, 'error');
  if (!reason || isX402ChallengeError(reason)) return null;
  return reason;
}
