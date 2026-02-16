'use client';

import { useQuery } from '@tanstack/react-query';
import {
  createPublicClient,
  http,
  numberToHex,
  padHex,
  type Address,
  type Hex,
  decodeAbiParameters,
} from 'viem';
import { abstract } from 'viem/chains';

const REPUTATION_REGISTRY =
  '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63' as const;

const NEW_FEEDBACK_TOPIC =
  '0x6a4a61743519c9d648a14e6493f47dbe3ff1aa29e7785c96c8326a205e58febc' as const;

const client = createPublicClient({ chain: abstract, transport: http() });

export interface KudosGivenEvent {
  agentId: number;
  tag1: string;
  tag2: string;
  message: string | null;
  feedbackURI: string;
  txHash: Hex;
  blockNumber: bigint;
}

function parseMessage(feedbackURI: string): string | null {
  try {
    if (feedbackURI.startsWith('data:application/json;base64,')) {
      const json = decodeURIComponent(
        escape(atob(feedbackURI.replace('data:application/json;base64,', '')))
      );
      const payload = JSON.parse(json);
      return payload.reasoning || payload.message || null;
    }
    if (feedbackURI.startsWith('data:,')) {
      return decodeURIComponent(feedbackURI.slice(6)) || null;
    }
  } catch {
    // ignore malformed URIs
  }
  return null;
}

async function fetchKudosGiven(address: Address): Promise<KudosGivenEvent[]> {
  // Contract deployed around block 39860000; use safe margin
  const fromBlock = BigInt(39_000_000);

  // topic[2] is the indexed clientAddress (the person giving feedback)
  const senderTopic = padHex(address.toLowerCase() as Hex, { size: 32 });

  const logs = await client.request({
    method: 'eth_getLogs',
    params: [
      {
        address: REPUTATION_REGISTRY,
        topics: [NEW_FEEDBACK_TOPIC, null, senderTopic],
        fromBlock: numberToHex(fromBlock),
        toBlock: 'latest',
      },
    ],
  });

  const events: KudosGivenEvent[] = [];

  for (const log of logs as Array<{
    topics: Hex[];
    data: Hex;
    blockNumber: Hex;
    transactionHash: Hex;
  }>) {
    try {
      const agentId = Number(BigInt(log.topics[1]));

      const decoded = decodeAbiParameters(
        [
          { name: 'feedbackIndex', type: 'uint64' },
          { name: 'value', type: 'int128' },
          { name: 'valueDecimals', type: 'uint8' },
          { name: 'tag1', type: 'string' },
          { name: 'tag2', type: 'string' },
          { name: 'endpoint', type: 'string' },
          { name: 'feedbackURI', type: 'string' },
          { name: 'feedbackHash', type: 'bytes32' },
        ],
        log.data
      );

      const feedbackURI = decoded[6];

      events.push({
        agentId,
        tag1: decoded[3],
        tag2: decoded[4],
        message: parseMessage(feedbackURI),
        feedbackURI,
        txHash: log.transactionHash,
        blockNumber: BigInt(log.blockNumber),
      });
    } catch {
      // skip malformed events
    }
  }

  return events.sort((a, b) => Number(b.blockNumber - a.blockNumber));
}

export function useKudosGiven(address: Address | undefined) {
  return useQuery({
    queryKey: ['kudos-given', address],
    queryFn: () => fetchKudosGiven(address!),
    enabled: !!address,
    staleTime: 60_000,
  });
}
