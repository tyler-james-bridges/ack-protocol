/**
 * Nevermined Payments SDK integration for ACK Protocol.
 *
 * Provides a singleton Payments instance and a validation function
 * for protecting API routes with Nevermined credit-based payments.
 *
 * If NVM_API_KEY is not set, validation is a no-op (graceful fallback).
 */

import { Payments, buildPaymentRequired } from '@nevermined-io/payments';
import type {
  X402PaymentRequired,
  VerifyPermissionsResult,
  SettlePermissionsResult,
  EnvironmentName,
} from '@nevermined-io/payments';
import { NextRequest, NextResponse } from 'next/server';

const NVM_API_KEY = process.env.NVM_API_KEY;
const NVM_ENVIRONMENT = (process.env.NVM_ENVIRONMENT ||
  'sandbox') as EnvironmentName;

let _payments: Payments | null = null;

/**
 * Returns the Nevermined Payments singleton, or null if not configured.
 */
export function getPayments(): Payments | null {
  if (!NVM_API_KEY) return null;
  if (!_payments) {
    _payments = Payments.getInstance({
      nvmApiKey: NVM_API_KEY,
      environment: NVM_ENVIRONMENT,
    });
  }
  return _payments;
}

export interface NeverminedValidationResult {
  /** Whether the request is authorized */
  authorized: boolean;
  /** If not authorized, a NextResponse with 402 status and x402 headers */
  response?: NextResponse;
  /** If authorized, the verify result from Nevermined */
  verification?: VerifyPermissionsResult;
  /** Agent request ID for settlement tracking */
  agentRequestId?: string;
}

/**
 * Validates a Nevermined payment for an incoming request.
 *
 * Checks the `payment-signature` header (x402 v2) for a valid access token,
 * verifies the subscriber has credits, and returns authorization status.
 *
 * If NVM_API_KEY is not configured, returns authorized=true (graceful fallback).
 *
 * After a successful response, call `settleNeverminedPayment` to burn credits.
 */
export async function validateNeverminedPayment(
  req: NextRequest,
  planId: string,
  agentId: string,
  options?: {
    endpoint?: string;
    creditsToVerify?: bigint;
  }
): Promise<NeverminedValidationResult> {
  const payments = getPayments();
  if (!payments) {
    // Nevermined not configured, allow request through
    return { authorized: true };
  }

  const x402Token = req.headers.get('payment-signature');
  if (!x402Token) {
    const paymentRequired = buildPaymentRequired(planId, {
      endpoint: options?.endpoint || req.nextUrl.pathname,
      agentId,
      httpVerb: req.method,
      environment: NVM_ENVIRONMENT,
    });

    return {
      authorized: false,
      response: buildPaymentRequiredResponse(paymentRequired),
    };
  }

  try {
    const paymentRequired = buildPaymentRequired(planId, {
      endpoint: options?.endpoint || req.nextUrl.pathname,
      agentId,
      httpVerb: req.method,
      environment: NVM_ENVIRONMENT,
    });

    const verification = await payments.facilitator.verifyPermissions({
      paymentRequired,
      x402AccessToken: x402Token,
      maxAmount: options?.creditsToVerify ?? BigInt(1),
    });

    if (!verification.isValid) {
      return {
        authorized: false,
        response: buildPaymentRequiredResponse(
          paymentRequired,
          verification.invalidReason
        ),
      };
    }

    return {
      authorized: true,
      verification,
      agentRequestId: verification.agentRequestId,
    };
  } catch (err) {
    console.error('[nevermined] Verification failed:', err);
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Payment verification failed' },
        { status: 402 }
      ),
    };
  }
}

/**
 * Settles (burns credits for) a Nevermined payment after serving the response.
 *
 * Call this after successfully handling the request to deduct credits.
 * No-op if Nevermined is not configured.
 */
export async function settleNeverminedPayment(
  req: NextRequest,
  planId: string,
  agentId: string,
  options?: {
    endpoint?: string;
    creditsToBurn?: bigint;
    agentRequestId?: string;
  }
): Promise<SettlePermissionsResult | null> {
  const payments = getPayments();
  if (!payments) return null;

  const x402Token = req.headers.get('payment-signature');
  if (!x402Token) return null;

  const paymentRequired = buildPaymentRequired(planId, {
    endpoint: options?.endpoint || req.nextUrl.pathname,
    agentId,
    httpVerb: req.method,
    environment: NVM_ENVIRONMENT,
  });

  return payments.facilitator.settlePermissions({
    paymentRequired,
    x402AccessToken: x402Token,
    maxAmount: options?.creditsToBurn ?? BigInt(1),
    agentRequestId: options?.agentRequestId,
  });
}

function buildPaymentRequiredResponse(
  paymentRequired: X402PaymentRequired,
  reason?: string
): NextResponse {
  return NextResponse.json(
    {
      error: reason || 'Payment Required',
      ...paymentRequired,
    },
    {
      status: 402,
      headers: {
        'Content-Type': 'application/json',
        'X-Payment-Required': 'true',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, payment-signature',
        'Access-Control-Expose-Headers': 'X-Payment-Required',
      },
    }
  );
}
