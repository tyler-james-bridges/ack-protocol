import { NextRequest, NextResponse } from 'next/server';
import { getDb, ensureMigrations, hasDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  if (!hasDb()) {
    return NextResponse.json({ items: [] });
  }

  const { searchParams } = request.nextUrl;
  const agentId = searchParams.get('agentId');
  const limit = Math.min(Number(searchParams.get('limit') || 20), 50);

  if (!agentId) {
    return NextResponse.json({ error: 'agentId required' }, { status: 400 });
  }

  await ensureMigrations();
  const sql = getDb();

  try {
    // Return completed standalone tips (no kudos link) for this agent
    const rows = await sql`
      SELECT id, agent_id, amount_usd, from_address, to_address,
             payment_tx_hash, completed_at, kudos_tx_hash
      FROM tips
      WHERE agent_id = ${Number(agentId)}
        AND status = 'completed'
        AND (kudos_tx_hash IS NULL OR kudos_tx_hash = '')
      ORDER BY completed_at DESC
      LIMIT ${limit}
    `;

    // Resolve payer agent info via 8004scan
    const items = await Promise.all(
      rows.map(async (row: Record<string, unknown>) => {
        const fromAddress = String(row.from_address);
        let fromAgent = null;

        try {
          const res = await fetch(
            `https://www.8004scan.io/api/v1/agents?search=${fromAddress}&limit=5`
          );
          if (res.ok) {
            const data = await res.json();
            const match = (data.items || []).find(
              (a: {
                chain_id: number;
                owner_address?: string;
                agent_wallet?: string;
              }) =>
                a.chain_id === 2741 &&
                (a.owner_address?.toLowerCase() === fromAddress.toLowerCase() ||
                  a.agent_wallet?.toLowerCase() === fromAddress.toLowerCase())
            );
            if (match) {
              fromAgent = {
                name: match.name,
                imageUrl: match.image_url || null,
                chainId: match.chain_id,
                tokenId: match.token_id,
              };
            }
          }
        } catch {
          // ignore resolution failures
        }

        return {
          type: 'tip' as const,
          tipId: row.id,
          agentId: row.agent_id,
          amountUsd: row.amount_usd,
          fromAddress,
          fromAgent,
          paymentTxHash: row.payment_tx_hash || null,
          completedAt: row.completed_at,
        };
      })
    );

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
