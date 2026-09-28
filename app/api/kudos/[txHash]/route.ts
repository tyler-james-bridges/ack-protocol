import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, decodeAbiParameters, type Hex } from 'viem';
import {
  DEFAULT_8004_CHAIN_ID,
  SUPPORTED_8004_CHAINS,
  getChainConfig,
} from '@/config/chain';

const REPUTATION_REGISTRY =
  '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63' as const;
const NEW_FEEDBACK_TOPIC =
  '0x6a4a61743519c9d648a14e6493f47dbe3ff1aa29e7785c96c8326a205e58febc' as const;

const agentNames: Record<string, string> = {};

async function getAgentName(agentId: number, chainId: number): Promise<string> {
  const key = `${chainId}:${agentId}`;
  if (agentNames[key]) return agentNames[key];

  try {
    const apiKey = process.env.EIGHTOOSCAN_API_KEY;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (apiKey) headers['x-api-key'] = apiKey;

    const res = await fetch(
      `https://api.8004scan.io/api/v1/agents?chainId=${chainId}&search=&limit=100`,
      { headers }
    );
    if (res.ok) {
      const data = await res.json();
      for (const agent of data.items || []) {
        agentNames[`${chainId}:${Number(agent.token_id)}`] = agent.name;
      }
    }
  } catch {}

  return agentNames[key] || `Agent #${agentId}`;
}

async function findReceipt(txHash: Hex) {
  const chainIds = [
    DEFAULT_8004_CHAIN_ID,
    ...Object.keys(SUPPORTED_8004_CHAINS)
      .map(Number)
      .filter((id) => id !== DEFAULT_8004_CHAIN_ID),
  ];
  for (const chainId of chainIds) {
    const cfg = getChainConfig(chainId);
    const client = createPublicClient({
      chain: cfg.chain,
      transport: http(cfg.rpcUrl),
    });
    try {
      const receipt = await client.getTransactionReceipt({ hash: txHash });
      const block = await client.getBlock({
        blockNumber: receipt.blockNumber,
      });
      return { receipt, block, chainId };
    } catch {
      continue;
    }
  }
  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ txHash: string }> }
) {
  const { txHash } = await params;

  if (!txHash || !txHash.startsWith('0x') || txHash.length !== 66) {
    return NextResponse.json({ error: 'Invalid tx hash' }, { status: 400 });
  }

  try {
    const found = await findReceipt(txHash as Hex);
    if (!found) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }
    const { receipt, block, chainId } = found;

    if (receipt.status !== 'success') {
      return NextResponse.json(
        { error: 'Transaction failed' },
        { status: 404 }
      );
    }

    // Find the FeedbackGiven event
    const feedbackLog = receipt.logs.find(
      (log) =>
        log.address.toLowerCase() === REPUTATION_REGISTRY.toLowerCase() &&
        log.topics[0] === NEW_FEEDBACK_TOPIC
    );

    if (!feedbackLog) {
      return NextResponse.json(
        { error: 'No feedback event in this transaction' },
        { status: 404 }
      );
    }

    // Decode indexed topics
    const agentId = Number(BigInt(feedbackLog.topics[1] as Hex));
    const sender = ('0x' +
      (feedbackLog.topics[2] as string).slice(26)) as string;

    // Decode non-indexed data
    const decoded = decodeAbiParameters(
      [
        { name: 'feedbackIndex', type: 'uint64' },
        { name: 'value', type: 'int128' },
        { name: 'valueDecimals', type: 'uint8' },
        { name: 'tag1', type: 'string' },
        { name: 'tag2', type: 'string' },
        { name: 'endpoint', type: 'string' },
        { name: 'feedbackURI', type: 'string' },
      ],
      feedbackLog.data as Hex
    );

    const value = Number(decoded[1]);
    const tag1 = decoded[3] as string;
    const tag2 = decoded[4] as string;
    const feedbackURI = decoded[6] as string;

    // Parse feedbackURI for metadata
    let from = '';
    let category = tag1 || '';
    let message = '';
    let source = '';

    if (feedbackURI.startsWith('data:,')) {
      try {
        const json = JSON.parse(feedbackURI.slice(6));
        from = json.from || '';
        category = json.category || category;
        message = json.message || '';
        source = json.source || '';
      } catch {}
    }

    const agentName = await getAgentName(agentId, chainId);

    return NextResponse.json({
      txHash,
      chainId,
      agentId,
      agentName,
      sender,
      senderName: from.replace('twitter:@', '@'),
      value,
      category,
      message,
      from: from.replace('twitter:', ''),
      source,
      tag1,
      tag2,
      timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
      blockNumber: receipt.blockNumber.toString(),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
