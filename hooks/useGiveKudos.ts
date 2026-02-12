'use client';

import { useState, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { keccak256, toBytes } from 'viem';
import { REPUTATION_REGISTRY_ABI } from '@/config/abi';
import {
  REPUTATION_REGISTRY_ADDRESS,
  KUDOS_TAG1,
  KUDOS_VALUE,
  KUDOS_VALUE_DECIMALS,
  AGENT_REGISTRY_CAIP10,
  toCAIP10Address,
} from '@/config/contract';
import type { KudosCategory } from '@/config/contract';
import { chain } from '@/config/chain';

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
        // Build ERC-8004 best-practices compliant offchain feedback file
        // Stored onchain as base64 data URI — no IPFS dependency
        const feedbackFile = {
          agentRegistry: AGENT_REGISTRY_CAIP10,
          agentId: params.agentId,
          clientAddress: toCAIP10Address(params.clientAddress),
          createdAt: new Date().toISOString(),
          value: String(KUDOS_VALUE),
          valueDecimals: KUDOS_VALUE_DECIMALS,
          tag1: KUDOS_TAG1,
          tag2: params.category,
          reasoning: params.message.trim(),
          ...(params.fromAgentId !== undefined && {
            fromAgentId: params.fromAgentId,
          }),
        };

        // Encode as base64 data URI (UTF-8 safe, spec-compliant)
        const jsonStr = JSON.stringify(feedbackFile);
        const feedbackURI = `data:application/json;base64,${btoa(unescape(encodeURIComponent(jsonStr)))}`;

        // feedbackHash: keccak256 of the feedbackURI content per ERC-8004 spec
        const feedbackHash = keccak256(toBytes(jsonStr));

        setStatus('confirming');
        writeContract(
          {
            address: REPUTATION_REGISTRY_ADDRESS,
            abi: REPUTATION_REGISTRY_ABI,
            functionName: 'giveFeedback',
            args: [
              BigInt(params.agentId),
              BigInt(KUDOS_VALUE), // value: 5-star positive endorsement
              KUDOS_VALUE_DECIMALS, // valueDecimals: 0
              KUDOS_TAG1, // tag1: "kudos"
              params.category, // tag2: category
              '', // endpoint: empty (not service-specific)
              feedbackURI, // feedbackURI: structured JSON data URI
              feedbackHash, // feedbackHash: keccak256 of JSON content
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
    resetWrite();
  }, [resetWrite]);

  // Update status when tx confirms
  const finalStatus: KudosStatus = txConfirmed ? 'success' : status;

  return {
    giveKudos,
    status: finalStatus,
    error,
    txHash,
    reset,
    isLoading:
      finalStatus === 'confirming' ||
      finalStatus === 'waiting',
  };
}
