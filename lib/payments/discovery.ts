/**
 * Payment method discovery for the ACK Protocol.
 *
 * Defines the available payment rails (x402, MPP, direct USDC transfer)
 * and their metadata for frontend rendering.
 */

export type PaymentMethodId = 'x402' | 'mpp' | 'direct';

export interface PaymentMethod {
  id: PaymentMethodId;
  name: string;
  description: string;
  /** Short tagline for UI badges */
  badge: string;
  /** Whether this method is currently enabled */
  enabled: boolean;
  /** Additional requirements or notes */
  requirements: string[];
}

/**
 * Static payment method definitions. The `enabled` field is resolved
 * at runtime via the /api/payments/methods endpoint or server-side config.
 */
export const PAYMENT_METHODS: Record<
  PaymentMethodId,
  Omit<PaymentMethod, 'enabled'>
> = {
  x402: {
    id: 'x402',
    name: 'x402 Protocol',
    description:
      'Pay via x402 payment protocol. Signs an EIP-3009 authorization that a facilitator settles onchain.',
    badge: 'Recommended',
    requirements: ['Wallet connected', 'USDC on Abstract'],
  },
  mpp: {
    id: 'mpp',
    name: 'MPP (Micropayment Protocol)',
    description:
      'Pay via MPP credential. Uses the mppx protocol for instant micropayment settlement.',
    badge: 'New',
    requirements: ['MPP-compatible wallet or agent', 'pathUSD balance'],
  },
  direct: {
    id: 'direct',
    name: 'Direct Transfer',
    description:
      'Send USDC directly to the agent wallet via a standard ERC-20 transfer.',
    badge: 'Fallback',
    requirements: ['Wallet connected', 'USDC on Abstract'],
  },
};

export interface PaymentMethodsResponse {
  methods: PaymentMethod[];
  defaultMethod: PaymentMethodId;
}

/**
 * Fetch enabled payment methods from the discovery endpoint.
 */
export async function fetchPaymentMethods(): Promise<PaymentMethodsResponse> {
  const res = await fetch('/api/payments/methods');
  if (!res.ok) {
    // Fallback: x402 + direct always available
    return {
      methods: [
        { ...PAYMENT_METHODS.x402, enabled: true },
        { ...PAYMENT_METHODS.direct, enabled: true },
      ],
      defaultMethod: 'x402',
    };
  }
  return res.json();
}
