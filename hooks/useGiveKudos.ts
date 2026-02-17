'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { REPUTATION_REGISTRY_ABI } from '@/config/abi';
import {
  REPUTATION_REGISTRY_ADDRESS,
  KUDOS_TAG1,
  KUDOS_VALUE,
  KUDOS_VALUE_DECIMALS,
  REVIEW_TAG1,
  REVIEW_VALUE_DECIMALS,
} from '@/config/contract';
import type { KudosCategory } from '@/config/contract';
import { chain as defaultChain } from '@/config/chain';
import { buildFeedback } from '@/lib/feedback';

interface GiveKudosParams {
  agentId: number;
  category: KudosCategory;
  message: string;
  clientAddress: string;
  fromAgentId?: number;
  isReview?: boolean;
  value?: number;
  /** Chain ID of the target agent. Defaults to Abstract. */
  targetChainId?: number;
}

type KudosStatus = 'idle' | 'confirming' | 'waiting' | 'success' | 'error';

/**
 * Hook to give kudos to an agent.
 *
 * Uses standard writeContract. Gas is paid by the user (~$0.001 on Abstract).
 * Abstract's paymaster rejects giveFeedback with a Panic error during
 * validation, so we skip sponsorship entirely for honest UX.
 */
export function useGiveKudos() {
  const [status, setStatus] = useState<KudosStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [kudosAgentId, setKudosAgentId] = useState<number | null>(null);
  const [txChainId, setTxChainId] = useState<number>(defaultChain.id);
  const queryClient = useQueryClient();

  const { writeContract, data: txHash, reset: resetWrite } = useWriteContract();

  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: txChainId,
  });

  useEffect(() => {
    if (!txConfirmed) return;
    const timer = setTimeout(() => {
      queryClient.invalidateQueries({
        queryKey: ['kudos-received', kudosAgentId],
      });
      queryClient.invalidateQueries({ queryKey: ['cross-chain-rep'] });
      queryClient.invalidateQueries({ queryKey: ['network-stats'] });
      queryClient.invalidateQueries({ queryKey: ['abstract-feedback-counts'] });
      queryClient.invalidateQueries({ queryKey: ['recent-kudos'] });
      queryClient.invalidateQueries({ queryKey: ['kudos-given'] });
      queryClient.invalidateQueries({ queryKey: ['readContract'] });
    }, 2000);
    return () => clearTimeout(timer);
  }, [txConfirmed, kudosAgentId, queryClient]);

  const giveKudos = useCallback(
    async (params: GiveKudosParams) => {
      const chainId = params.targetChainId ?? defaultChain.id;
      setError(null);
      setStatus('confirming');
      setKudosAgentId(params.agentId);
      setTxChainId(chainId);

      try {
        const tag1 = params.isReview ? REVIEW_TAG1 : KUDOS_TAG1;
        const value = params.isReview ? (params.value ?? 0) : KUDOS_VALUE;
        const decimals = params.isReview
          ? REVIEW_VALUE_DECIMALS
          : KUDOS_VALUE_DECIMALS;

        const { feedbackURI, feedbackHash } = buildFeedback({
          agentId: params.agentId,
          clientAddress: params.clientAddress,
          category: params.category,
          message: params.message,
          fromAgentId: params.fromAgentId,
          value,
          tag1,
        });

        writeContract(
          {
            address: REPUTATION_REGISTRY_ADDRESS,
            abi: REPUTATION_REGISTRY_ABI,
            functionName: 'giveFeedback',
            args: [
              BigInt(params.agentId),
              BigInt(value),
              decimals,
              tag1,
              params.category,
              '',
              feedbackURI,
              feedbackHash,
            ],
            chainId,
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

  const finalStatus: KudosStatus = txConfirmed ? 'success' : status;

  return {
    giveKudos,
    status: finalStatus,
    error,
    txHash,
    reset,
    isLoading: finalStatus === 'confirming' || finalStatus === 'waiting',
  };
}
