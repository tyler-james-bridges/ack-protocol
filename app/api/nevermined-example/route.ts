/**
 * Example API route demonstrating Nevermined payment integration.
 *
 * This shows the pattern for wrapping any existing endpoint with
 * credit-based payment validation. Copy and adapt for real routes.
 *
 * Headers:
 *   payment-signature: x402 access token from Nevermined subscriber
 *
 * Flow:
 *   1. Validate payment (returns 402 if no token or insufficient credits)
 *   2. Handle request normally
 *   3. Settle payment (burn credits)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  validateNeverminedPayment,
  settleNeverminedPayment,
} from '@/lib/nevermined';

// These would come from env vars after running the registration script
const PLAN_ID = process.env.NVM_PREPAID_PLAN_ID || '';
const AGENT_ID = process.env.NVM_AGENT_ID || '';

export async function POST(req: NextRequest) {
  // Step 1: Validate payment
  const validation = await validateNeverminedPayment(req, PLAN_ID, AGENT_ID, {
    creditsToVerify: BigInt(1),
  });

  if (!validation.authorized) {
    return (
      validation.response ||
      NextResponse.json({ error: 'Payment Required' }, { status: 402 })
    );
  }

  // Step 2: Handle the actual request
  const data = {
    message: 'This is a paid response from ACK Protocol',
    timestamp: new Date().toISOString(),
  };

  // Step 3: Settle payment (burn credits) after successful response
  const settlement = await settleNeverminedPayment(req, PLAN_ID, AGENT_ID, {
    creditsToBurn: BigInt(1),
    agentRequestId: validation.agentRequestId,
  });

  return NextResponse.json({
    ...data,
    payment: settlement
      ? {
          creditsRedeemed: settlement.creditsRedeemed,
          remainingBalance: settlement.remainingBalance,
          transaction: settlement.transaction,
        }
      : undefined,
  });
}

/**
 * GET handler returns discovery info (no payment required).
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/nevermined-example',
    description: 'Example Nevermined-protected endpoint',
    creditsPerRequest: 1,
    paymentHeader: 'payment-signature',
    planId: PLAN_ID || 'not configured',
  });
}
