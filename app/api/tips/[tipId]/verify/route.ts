import { NextResponse } from 'next/server';
import { createPublicClient, http, type Hex } from 'viem';
import { abstract } from 'viem/chains';
import { getTip, completeTip, tipToJSON } from '@/lib/tip-store';
import { USDC_ADDRESS } from '@/config/tokens';

const client = createPublicClient({ chain: abstract, transport: http() });

/**
 * POST /api/tips/[tipId]/verify
 *
 * Verify a USDC tip payment onchain. Checks the tx receipt for a
 * Transfer event on the USDC contract matching the expected recipient
 * and amount, then marks the tip as completed.
 *
 * Body: { txHash: string }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ tipId: string }> }
) {
  const { tipId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { txHash } = body as { txHash?: string };

  if (typeof txHash !== 'string' || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return NextResponse.json(
      { error: 'txHash must be a valid transaction hash' },
      { status: 400 }
    );
  }

  const tip = await getTip(tipId);
  if (!tip) {
    return NextResponse.json(
      { error: 'Tip not found or not in pending status' },
      { status: 404 }
    );
  }

  if (tip.status !== 'pending') {
    return NextResponse.json(
      { error: `Tip is already ${tip.status}` },
      { status: 409 }
    );
  }

  // Fetch the transaction receipt from Abstract
  let receipt;
  try {
    receipt = await client.getTransactionReceipt({ hash: txHash as Hex });
  } catch {
    return NextResponse.json(
      { error: 'Transaction not found or not yet confirmed' },
      { status: 404 }
    );
  }

  if (receipt.status !== 'success') {
    return NextResponse.json(
      { error: 'Transaction reverted' },
      { status: 400 }
    );
  }

  // Look for a USDC Transfer event matching our expected recipient and amount
  const expectedTo = tip.toAddress.toLowerCase();
  const expectedAmount = tip.amountRaw;

  const matchingLog = receipt.logs.find((log) => {
    if (log.address.toLowerCase() !== USDC_ADDRESS.toLowerCase()) return false;

    // ERC-20 Transfer: topic[0] = event sig, topic[1] = from, topic[2] = to
    if (
      !log.topics[0] ||
      log.topics[0] !==
        '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    ) {
      return false;
    }

    // topic[2] is the recipient, zero-padded to 32 bytes
    const toTopic = log.topics[2];
    if (!toTopic) return false;
    const logTo = ('0x' + toTopic.slice(26)).toLowerCase();

    if (logTo !== expectedTo) return false;

    // data contains the uint256 amount
    const logAmount = BigInt(log.data);

    return logAmount >= expectedAmount;
  });

  if (!matchingLog) {
    return NextResponse.json(
      {
        error:
          'No matching USDC transfer found in transaction. ' +
          'Expected transfer to ' +
          tip.toAddress +
          ' of at least ' +
          tip.amountRaw.toString() +
          ' raw units.',
      },
      { status: 400 }
    );
  }

  const updated = await completeTip(tipId, txHash);
  if (!updated) {
    return NextResponse.json(
      { error: 'Failed to update tip record' },
      { status: 500 }
    );
  }

  return NextResponse.json({ verified: true, tip: tipToJSON(updated) });
}
