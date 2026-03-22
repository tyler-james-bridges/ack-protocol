/**
 * MPP / Tempo error mapping.
 *
 * Maps raw RPC and mppx SDK errors to user-facing messages so the UI
 * never shows raw JSON-RPC noise.
 */

export interface MppUserError {
  /** Short machine-readable code for the frontend */
  code: string;
  /** Human-readable message safe to display in the UI */
  message: string;
  /** Whether the user could retry with a different action */
  recoverable: boolean;
}

const PATTERNS: Array<{
  test: (msg: string) => boolean;
  error: MppUserError;
}> = [
  {
    test: (m) =>
      /account.*not\s*found|unknown\s*account/i.test(m) ||
      /no\s*account/i.test(m),
    error: {
      code: 'MPP_ACCOUNT_NOT_FOUND',
      message:
        'Your wallet does not have a Tempo account. MPP payments require a Tempo-compatible account.',
      recoverable: false,
    },
  },
  {
    test: (m) =>
      /unsupported.*method|method.*not.*supported/i.test(m) ||
      /no\s*method\s*found/i.test(m),
    error: {
      code: 'MPP_METHOD_UNSUPPORTED',
      message:
        'This wallet does not support the required payment method. Try using x402 or direct transfer instead.',
      recoverable: false,
    },
  },
  {
    test: (m) => /invalid.*asset|unsupported.*token|unknown.*currency/i.test(m),
    error: {
      code: 'MPP_INVALID_ASSET',
      message:
        'The required payment token is not supported by your account. Check that you have the correct asset configured.',
      recoverable: false,
    },
  },
  {
    test: (m) =>
      /insufficient.*balance|insufficient.*funds|not\s*enough/i.test(m),
    error: {
      code: 'MPP_INSUFFICIENT_BALANCE',
      message:
        'Insufficient balance to complete this payment. Top up your Tempo account and try again.',
      recoverable: true,
    },
  },
  {
    test: (m) => /user\s*(reject|denied|cancel)/i.test(m),
    error: {
      code: 'MPP_USER_REJECTED',
      message: 'Payment was cancelled.',
      recoverable: true,
    },
  },
  {
    test: (m) => /timeout|timed?\s*out/i.test(m),
    error: {
      code: 'MPP_TIMEOUT',
      message: 'Payment request timed out. Please try again.',
      recoverable: true,
    },
  },
  {
    test: (m) =>
      /credential.*malformed|malformed.*credential/i.test(m) ||
      /invalid.*credential/i.test(m),
    error: {
      code: 'MPP_CREDENTIAL_INVALID',
      message:
        'Payment credential is invalid. Please retry the payment from scratch.',
      recoverable: true,
    },
  },
  {
    test: (m) => /challenge.*invalid|invalid.*challenge/i.test(m),
    error: {
      code: 'MPP_CHALLENGE_INVALID',
      message: 'Payment challenge expired or was tampered with. Please retry.',
      recoverable: true,
    },
  },
  {
    test: (m) => /expired|payment.*expired/i.test(m),
    error: {
      code: 'MPP_EXPIRED',
      message: 'Payment authorization has expired. Please start over.',
      recoverable: true,
    },
  },
  {
    test: (m) => /verification.*failed|verify.*failed/i.test(m),
    error: {
      code: 'MPP_VERIFICATION_FAILED',
      message:
        'Payment verification failed. The transaction may not have settled correctly.',
      recoverable: true,
    },
  },
  {
    test: (m) => /secret.*key|MPP_SECRET_KEY/i.test(m),
    error: {
      code: 'MPP_CONFIG_ERROR',
      message:
        'Payment service is misconfigured. Please try another payment method.',
      recoverable: false,
    },
  },
];

/**
 * Map a raw error (from mppx SDK, RPC, or catch blocks) to a user-friendly error.
 * Returns `null` if the error does not match any known pattern.
 */
export function mapMppError(err: unknown): MppUserError {
  const msg =
    err instanceof Error ? err.message : typeof err === 'string' ? err : '';

  for (const pattern of PATTERNS) {
    if (pattern.test(msg)) return pattern.error;
  }

  return {
    code: 'MPP_UNKNOWN_ERROR',
    message: 'MPP payment failed. Please try x402 or direct transfer instead.',
    recoverable: true,
  };
}

/**
 * Client-side helper: map an error from the pay API (or catch block) to a
 * short, actionable UI string. Used in the tip component to display friendly
 * error text instead of raw JSON-RPC noise.
 */
export function mapMppErrorToUiMessage(err: unknown): string {
  // If the API returned a problem+json body with `detail`, prefer it
  if (
    typeof err === 'object' &&
    err !== null &&
    'detail' in err &&
    typeof (err as Record<string, unknown>).detail === 'string'
  ) {
    return (err as { detail: string }).detail;
  }

  const mapped = mapMppError(err);
  return mapped.message;
}
