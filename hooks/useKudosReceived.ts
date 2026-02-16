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

// NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex,
//   int128 value, uint8 valueDecimals, string indexed indexedTag1, string tag1, string tag2,
//   string endpoint, string feedbackURI, bytes32 feedbackHash)
// keccak256("NewFeedback(uint256,address,uint64,int128,uint8,string,string,string,string,string,bytes32)")
const NEW_FEEDBACK_TOPIC =
  '0x6a4a61743519c9d648a14e6493f47dbe3ff1aa29e7785c96c8326a205e58febc' as const;

export interface KudosEvent {
  sender: Address;
  feedbackIndex: bigint;
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
  // Contract deployed around block 39860000; use safe margin
  const fromBlock = BigInt(39_000_000);

  // topic[0]=event sig, topic[1]=agentId (indexed uint256)
  const agentIdTopic = padHex(numberToHex(agentId), { size: 32 });

  const logs = await client.request({
    method: 'eth_getLogs',
    params: [
      {
        address: REPUTATION_REGISTRY,
        topics: [NEW_FEEDBACK_TOPIC, agentIdTopic],
        fromBlock: numberToHex(fromBlock),
        toBlock: 'latest',
      },
    ],
  });

  // ERC-8004 NewFeedback event layout:
  // Indexed: [0] event sig, [1] agentId, [2] clientAddress, [3] keccak256(tag1)
  // Non-indexed: feedbackIndex (uint64), value (int128), valueDecimals (uint8),
  //   tag1 (string), tag2 (string), endpoint (string), feedbackURI (string), feedbackHash (bytes32)
  return (
    logs as Array<{
      topics: Hex[];
      data: Hex;
      blockNumber: Hex;
      transactionHash: Hex;
    }>
  )
    .map((log) => {
      const sender = ('0x' + log.topics[2].slice(26)) as Address;
      // topic[3] is keccak256(tag1), NOT feedbackHash

      try {
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

        return {
          sender,
          feedbackIndex: decoded[0],
          value: decoded[1],
          tag1: decoded[3],
          tag2: decoded[4],
          feedbackURI: decoded[6],
          feedbackHash: decoded[7] as Hex,
          blockNumber: BigInt(log.blockNumber),
          txHash: log.transactionHash,
        };
      } catch {
        return null;
      }
    })
    .filter((e): e is KudosEvent => e !== null);
}

export function useKudosReceived(agentId: number | undefined) {
  return useQuery({
    queryKey: ['kudos-received', agentId],
    queryFn: () => fetchKudos(agentId!),
    enabled: agentId !== undefined,
    staleTime: 60_000,
  });
}
