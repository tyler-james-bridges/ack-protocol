'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWaitForTransactionReceipt } from 'wagmi';
import { useWriteContractSponsored } from '@abstract-foundation/agw-react';
import { getGeneralPaymasterInput } from 'viem/zksync';
import { useQueryClient } from '@tanstack/react-query';
import { REPUTATION_REGISTRY_ABI } from '@/config/abi';
import {
  REPUTATION_REGISTRY_ADDRESS,
  ABSTRACT_PAYMASTER_ADDRESS,
  KUDOS_TAG1,
  KUDOS_VALUE,
  KUDOS_VALUE_DECIMALS,
} from '@/config/contract';
import type { KudosCategory } from '@/config/contract';
import { chain } from '@/config/chain';
import { buildFeedback } from '@/lib/feedback';

interface GiveKudosParams {
  agentId: number;
  category: KudosCategory;
  message: string;
  clientAddress: string;
  fromAgentId?: number;
}

type KudosStatus = 'idle' | 'confirming' | 'waiting' | 'success' | 'error';

/**
 * Hook to give kudos to an agent with gas-sponsored transactions.
 *
 * Flow:
 * 1. Build feedback file and hash via shared utility
 * 2. Call giveFeedback() on the Reputation Registry (gas sponsored)
 * 3. Wait for transaction confirmation
 */
export function useGiveKudos() {
  const [status, setStatus] = useState<KudosStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [kudosAgentId, setKudosAgentId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const {
    writeContractSponsored,
    data: txHash,
    reset: resetWrite,
  } = useWriteContractSponsored();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: chain.id,
  });

  // When tx confirms, invalidate all related queries so the UI updates
  useEffect(() => {
    if (!txConfirmed) return;

    // Small delay to let the RPC index the new event, then refetch all related data
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
      setError(null);
      setStatus('confirming');
      setKudosAgentId(params.agentId);

      try {
        const { feedbackURI, feedbackHash } = buildFeedback({
          agentId: params.agentId,
          clientAddress: params.clientAddress,
          category: params.category,
          message: params.message,
          fromAgentId: params.fromAgentId,
        });

        setStatus('confirming');
        writeContractSponsored(
          {
            address: REPUTATION_REGISTRY_ADDRESS,
            abi: REPUTATION_REGISTRY_ABI,
            functionName: 'giveFeedback',
            args: [
              BigInt(params.agentId),
              BigInt(KUDOS_VALUE),
              KUDOS_VALUE_DECIMALS,
              KUDOS_TAG1,
              params.category,
              '',
              feedbackURI,
              feedbackHash,
            ],
            chainId: chain.id,
            paymaster: ABSTRACT_PAYMASTER_ADDRESS,
            paymasterInput: getGeneralPaymasterInput({ innerInput: '0x' }),
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
    [writeContractSponsored]
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
