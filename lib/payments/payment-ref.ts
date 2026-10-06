const EVM_TX_HASH = /^0x[a-fA-F0-9]{64}$/;

/** Stored when x402 verified a tip before the facilitator tx hash was available. */
export const X402_FACILITATOR_SETTLEMENT = 'x402-facilitator-settlement';

export function isEvmTxHash(value: string): boolean {
  return EVM_TX_HASH.test(value);
}

/**
 * Pull a Basescan-ready transaction hash out of a stored payment reference.
 * Accepts a bare `0x` hash or an `x402:` / `mpp:` prefix. The facilitator
 * placeholder and other non-hashes return null.
 */
export function paymentRefTxHash(
  ref: string | null | undefined
): string | null {
  if (!ref) return null;
  const raw = ref.replace(/^(x402:|mpp:)/, '');
  return isEvmTxHash(raw) ? raw : null;
}
