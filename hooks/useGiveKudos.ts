'use client';

import { useState, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { keccak256, toBytes } from 'viem';
import { REPUTATION_REGISTRY_ABI } from '@/config/abi';
import {
  REPUTATION_REGISTRY_ADDRESS,
  KUDOS_TAG1,
  IDENTITY_REGISTRY_ADDRESS,
} from '@/config/contract';
import type { KudosCategory } from '@/config/contract';
import { chain } from '@/config/chain';
// Kudos payload stored fully onchain as data URI

interface GiveKudosParams {
  agentId: number;
  category: KudosCategory;
  message: string;
  clientAddress: string;
  fromAgentId?: number;
}

type KudosStatus =
  | 'idle'
  | 'confirming'
  | 'waiting'
  | 'success'
  | 'error';

/**
 * Hook to give kudos to an agent.
 *
 * Flow:
 * 1. Upload kudos message to IPFS (Pinata)
 * 2. Hash the payload for feedbackHash
 * 3. Call giveFeedback() on the Reputation Registry
 * 4. Wait for transaction confirmation
 */
export function useGiveKudos() {
  const [status, setStatus] = useState<KudosStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [feedbackDataURI, setFeedbackDataURI] = useState<string | null>(null);

  const { writeContract, data: txHash, reset: resetWrite } = useWriteContract();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: chain.id,
  });

  const giveKudos = useCallback(
    async (params: GiveKudosParams) => {
      setError(null);
      setStatus('confirming');

      try {
        // Build kudos payload — stored fully onchain as data URI
        const payload = {
          agentRegistry: IDENTITY_REGISTRY_ADDRESS,
          agentId: params.agentId,
          clientAddress: params.clientAddress,
          createdAt: new Date().toISOString(),
          value: 100,
          valueDecimals: 0,
          tag1: 'kudos' as const,
          tag2: params.category,
          message: params.message,
          fromAgentId: params.fromAgentId,
        };

        // Store payload onchain as a base64 data URI — no IPFS dependency
        const feedbackURI = `data:application/json;base64,${btoa(JSON.stringify(payload))}`;

        // Step 2: Hash the payload for on-chain verification
        const feedbackHash = keccak256(toBytes(JSON.stringify(payload)));

        // Step 3: Call giveFeedback on the Reputation Registry
        setStatus('confirming');
        writeContract(
          {
            address: REPUTATION_REGISTRY_ADDRESS,
            abi: REPUTATION_REGISTRY_ABI,
            functionName: 'giveFeedback',
            args: [
              BigInt(params.agentId),
              BigInt(100), // value: 100 = positive kudos
              0, // valueDecimals: 0
              KUDOS_TAG1, // tag1: "kudos"
              params.category, // tag2: category
              '', // endpoint: empty (not service-specific)
              feedbackURI, // feedbackURI: IPFS link
              feedbackHash, // feedbackHash: keccak256 of payload
            ],
            chainId: chain.id,
          },
          {
            onSuccess: () => setStatus('waiting'),
            onError: (err) => {
              setError(err instanceof Error ? err : new Error(String(err)));
              setStatus('error');
            },
          }
        );
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setStatus('error');
      }
    },
    [writeContract]
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setFeedbackDataURI(null);
    resetWrite();
  }, [resetWrite]);

  // Update status when tx confirms
  const finalStatus: KudosStatus = txConfirmed ? 'success' : status;

  return {
    giveKudos,
    status: finalStatus,
    error,
    txHash,
    feedbackDataURI,
    reset,
    isLoading:
      finalStatus === 'confirming' ||
      finalStatus === 'waiting',
  };
}
