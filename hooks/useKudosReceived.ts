'use client';

import { useQuery } from '@tanstack/react-query';
import {
  createPublicClient,
  http,
  type Address,
  type Hex,
  decodeAbiParameters,
  numberToHex,
  padHex,
} from 'viem';
import { abstract } from 'viem/chains';

const REPUTATION_REGISTRY =
  '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63' as const;

// Actual event topic from on-chain tx logs
const FEEDBACK_GIVEN_TOPIC =
  '0x6a4a61743519c9d648a14e6493f47dbe3ff1aa29e7785c96c8326a205e58febc' as const;

export interface KudosEvent {
  sender: Address;
  value: bigint;
  tag1: string;
  tag2: string;
  feedbackURI: string;
  feedbackHash: Hex;
  blockNumber: bigint;
  txHash: Hex;
}

const client = createPublicClient({ chain: abstract, transport: http() });

async function fetchKudos(agentId: number): Promise<KudosEvent[]> {
  const currentBlock = await client.getBlockNumber();
  const fromBlock =
    currentBlock > BigInt(50000) ? currentBlock - BigInt(50000) : BigInt(0);

  // Filter by topic[0]=event sig, topic[1]=agentId (uint256, padded to 32 bytes)
  const agentIdTopic = padHex(numberToHex(agentId), { size: 32 });

  const logs = await client.request({
    method: 'eth_getLogs',
    params: [
      {
        address: REPUTATION_REGISTRY,
        topics: [FEEDBACK_GIVEN_TOPIC, agentIdTopic],
        fromBlock: numberToHex(fromBlock),
        toBlock: numberToHex(currentBlock),
      },
    ],
  });

  return (logs as Array<{
    topics: Hex[];
    data: Hex;
    blockNumber: Hex;
    transactionHash: Hex;
  }>)
    .map((log) => {
      const sender = ('0x' + log.topics[2].slice(26)) as Address;
      const feedbackHash = log.topics[3] as Hex;

      // Decode non-indexed data
      // Based on tx data: uint8 version, int128 value, uint8 valueDecimals,
      // string tag1, string tag2, string endpoint, string feedbackURI, bytes32 extraHash
      try {
        const decoded = decodeAbiParameters(
          [
            { name: 'version', type: 'uint8' },
            { name: 'value', type: 'int128' },
            { name: 'valueDecimals', type: 'uint8' },
            { name: 'tag1', type: 'string' },
            { name: 'tag2', type: 'string' },
            { name: 'endpoint', type: 'string' },
            { name: 'feedbackURI', type: 'string' },
            { name: 'extraHash', type: 'bytes32' },
          ],
          log.data
        );

        return {
          sender,
          value: decoded[1],
          tag1: decoded[3],
          tag2: decoded[4],
          feedbackURI: decoded[6],
          feedbackHash,
          blockNumber: BigInt(log.blockNumber),
          txHash: log.transactionHash,
        };
      } catch {
        return null;
      }
    })
    .filter((e): e is KudosEvent => e !== null && e.tag1 === 'kudos');
}

export function useKudosReceived(agentId: number | undefined) {
  return useQuery({
    queryKey: ['kudos-received', agentId],
    queryFn: () => fetchKudos(agentId!),
    enabled: agentId !== undefined,
    staleTime: 60_000,
  });
}
