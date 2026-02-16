'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
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
 * Hook to give kudos to an agent.
 *
 * Tries gas-sponsored tx first (Abstract paymaster).
 * Falls back to regular tx (user pays gas) if paymaster rejects.
 */
export function useGiveKudos() {
  const [status, setStatus] = useState<KudosStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [kudosAgentId, setKudosAgentId] = useState<number | null>(null);
  const [activeTxHash, setActiveTxHash] = useState<`0x${string}` | undefined>();
  const queryClient = useQueryClient();

  // Sponsored path
  const {
    writeContractSponsored,
    data: sponsoredHash,
    reset: resetSponsored,
  } = useWriteContractSponsored();

  // Fallback: user-pays-gas path
  const {
    writeContract,
    data: regularHash,
    reset: resetRegular,
  } = useWriteContract();

  // Track whichever hash is active
  useEffect(() => {
    if (sponsoredHash) setActiveTxHash(sponsoredHash);
  }, [sponsoredHash]);
  useEffect(() => {
    if (regularHash) setActiveTxHash(regularHash);
  }, [regularHash]);

  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({
    hash: activeTxHash,
    chainId: chain.id,
  });

  // Invalidate queries on confirmation
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
      setError(null);
      setStatus('confirming');
      setKudosAgentId(params.agentId);
      setActiveTxHash(undefined);

      try {
        const { feedbackURI, feedbackHash } = buildFeedback({
          agentId: params.agentId,
          clientAddress: params.clientAddress,
          category: params.category,
          message: params.message,
          fromAgentId: params.fromAgentId,
        });

        const contractArgs = {
          address: REPUTATION_REGISTRY_ADDRESS,
          abi: REPUTATION_REGISTRY_ABI,
          functionName: 'giveFeedback' as const,
          args: [
            BigInt(params.agentId),
            BigInt(KUDOS_VALUE),
            KUDOS_VALUE_DECIMALS,
            KUDOS_TAG1,
            params.category,
            '',
            feedbackURI,
            feedbackHash,
          ] as const,
          chainId: chain.id,
        };

        // Try sponsored first
        writeContractSponsored(
          {
            ...contractArgs,
            paymaster: ABSTRACT_PAYMASTER_ADDRESS,
            paymasterInput: getGeneralPaymasterInput({ innerInput: '0x' }),
          },
          {
            onSuccess: () => setStatus('waiting'),
            onError: () => {
              // Paymaster rejected, fall back to regular tx
              writeContract(contractArgs, {
                onSuccess: () => setStatus('waiting'),
                onError: (err) => {
                  setError(err instanceof Error ? err : new Error(String(err)));
                  setStatus('error');
                },
              });
            },
          }
        );
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setStatus('error');
      }
    },
    [writeContractSponsored, writeContract]
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setActiveTxHash(undefined);
    resetSponsored();
    resetRegular();
  }, [resetSponsored, resetRegular]);

  const finalStatus: KudosStatus = txConfirmed ? 'success' : status;

  return {
    giveKudos,
    status: finalStatus,
    error,
    txHash: activeTxHash,
    reset,
    isLoading: finalStatus === 'confirming' || finalStatus === 'waiting',
  };
}
