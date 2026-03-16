import { NextRequest, NextResponse } from 'next/server';
import { getDb, ensureMigrations, hasDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  if (!hasDb()) {
    return NextResponse.json({
      received: [],
      given: [],
      totalReceived: 0,
      totalGiven: 0,
    });
  }

  const { searchParams } = request.nextUrl;
  const agentId = searchParams.get('agentId');
  const wallet = searchParams.get('wallet');

  if (!agentId && !wallet) {
    return NextResponse.json(
      { error: 'agentId or wallet required' },
      { status: 400 }
    );
  }

  await ensureMigrations();
  const sql = getDb();

  try {
    // Tips received by this agent
    const received = agentId
      ? await sql`
          SELECT id, amount_usd, from_address, completed_at, payment_tx_hash
          FROM tips
          WHERE agent_id = ${Number(agentId)} AND status = 'completed'
          ORDER BY completed_at DESC
          LIMIT 50
        `
      : [];

    // Tips given by this wallet
    const given = wallet
      ? await sql`
          SELECT id, agent_id, amount_usd, completed_at, payment_tx_hash, kudos_tx_hash
          FROM tips
          WHERE LOWER(from_address) = ${wallet.toLowerCase()} AND status = 'completed'
          ORDER BY completed_at DESC
          LIMIT 50
        `
      : [];

    const totalReceived = received.reduce(
      (sum: number, t: Record<string, unknown>) =>
        sum + (Number(t.amount_usd) || 0),
      0
    );
    const totalGiven = given.reduce(
      (sum: number, t: Record<string, unknown>) =>
        sum + (Number(t.amount_usd) || 0),
      0
    );

    return NextResponse.json({
      received,
      given,
      totalReceived,
      totalGiven,
      countReceived: received.length,
      countGiven: given.length,
    });
  } catch {
    return NextResponse.json({
      received: [],
      given: [],
      totalReceived: 0,
      totalGiven: 0,
    });
  }
}
