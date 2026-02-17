'use client';

import { useState, useCallback } from 'react';
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { toHex, fromHex, type Hex } from 'viem';
import { IDENTITY_REGISTRY_ABI } from '@/config/abi';
import { IDENTITY_REGISTRY_ADDRESS } from '@/config/contract';
import { chain } from '@/config/chain';

/**
 * ACK metadata keys stored onchain via ERC-8004 setMetadata / getMetadata.
 *
 * These follow the "ack:" namespace convention:
 *   - ack:score        — aggregate reputation score (string-encoded number)
 *   - ack:kudos_count  — total kudos received (string-encoded integer)
 *   - ack:top_category — highest-frequency kudos category tag
 */
const ACK_KEYS = {
  score: 'ack:score',
  kudosCount: 'ack:kudos_count',
  topCategory: 'ack:top_category',
} as const;

type AckKey = keyof typeof ACK_KEYS;

export interface AckMetadata {
  score: string | null;
  kudosCount: string | null;
  topCategory: string | null;
}

type WriteStatus = 'idle' | 'confirming' | 'waiting' | 'success' | 'error';

/** Decode bytes returned by getMetadata into a UTF-8 string, or null if empty. */
function decodeMetadataBytes(raw: Hex | undefined): string | null {
  if (!raw || raw === '0x' || raw.length <= 2) return null;
  try {
    return fromHex(raw, 'string');
  } catch {
    return null;
  }
}

/**
 * Hook to read and write ACK reputation metadata on an agent's ERC-8004 identity.
 *
 * Reads:  getMetadata(agentId, key) for ack:score, ack:kudos_count, ack:top_category
 * Writes: setMetadata(agentId, key, value) via sponsored (gasless) transactions
 *
 * @param agentId - The ERC-8004 token ID of the agent. Pass undefined to disable.
 */
export function useAckMetadata(agentId: number | undefined) {
  const enabled = agentId !== undefined;
  const agentIdBigInt = enabled ? BigInt(agentId) : BigInt(0);

  // --- Reads ---

  const { data: rawScore, refetch: refetchScore } = useReadContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'getMetadata',
    args: [agentIdBigInt, ACK_KEYS.score],
    chainId: chain.id,
    query: { enabled },
  });

  const { data: rawKudosCount, refetch: refetchKudosCount } = useReadContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'getMetadata',
    args: [agentIdBigInt, ACK_KEYS.kudosCount],
    chainId: chain.id,
    query: { enabled },
  });

  const { data: rawTopCategory, refetch: refetchTopCategory } = useReadContract(
    {
      address: IDENTITY_REGISTRY_ADDRESS,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'getMetadata',
      args: [agentIdBigInt, ACK_KEYS.topCategory],
      chainId: chain.id,
      query: { enabled },
    }
  );

  const metadata: AckMetadata = {
    score: decodeMetadataBytes(rawScore as Hex | undefined),
    kudosCount: decodeMetadataBytes(rawKudosCount as Hex | undefined),
    topCategory: decodeMetadataBytes(rawTopCategory as Hex | undefined),
  };

  /** Refetch all three metadata values. */
  const refetch = useCallback(() => {
    refetchScore();
    refetchKudosCount();
    refetchTopCategory();
  }, [refetchScore, refetchKudosCount, refetchTopCategory]);

  // --- Write (gasless) ---

  const [writeStatus, setWriteStatus] = useState<WriteStatus>('idle');
  const [writeError, setWriteError] = useState<Error | null>(null);

  const {
    writeContract,
    data: writeTxHash,
    reset: resetWrite,
  } = useWriteContract();

  const { isSuccess: writeTxConfirmed } = useWaitForTransactionReceipt({
    hash: writeTxHash,
    chainId: chain.id,
  });

  const finalWriteStatus: WriteStatus = writeTxConfirmed
    ? 'success'
    : writeStatus;

  /**
   * Write a single ACK metadata key for this agent.
   *
   * @param key   — which ACK field to set: "score" | "kudosCount" | "topCategory"
   * @param value — the string value to store onchain (encoded as UTF-8 bytes)
   */
  const setAckMetadata = useCallback(
    (key: AckKey, value: string) => {
      if (!enabled) return;

      setWriteError(null);
      setWriteStatus('confirming');

      try {
        const metadataKey = ACK_KEYS[key];
        const metadataValue = toHex(value);

        writeContract(
          {
            address: IDENTITY_REGISTRY_ADDRESS,
            abi: IDENTITY_REGISTRY_ABI,
            functionName: 'setMetadata',
            args: [agentIdBigInt, metadataKey, metadataValue],
            chainId: chain.id,
          },
          {
            onSuccess: () => setWriteStatus('waiting'),
            onError: (err) => {
              setWriteError(
                err instanceof Error ? err : new Error(String(err))
              );
              setWriteStatus('error');
            },
          }
        );
      } catch (err) {
        setWriteError(err instanceof Error ? err : new Error(String(err)));
        setWriteStatus('error');
      }
    },
    [enabled, agentIdBigInt, writeContract]
  );

  const resetWriteState = useCallback(() => {
    setWriteStatus('idle');
    setWriteError(null);
    resetWrite();
  }, [resetWrite]);

  return {
    /** Current onchain ACK metadata (null per field if not yet set). */
    metadata,
    /** Refetch all ACK metadata reads. */
    refetch,

    /** Write a single ACK metadata field (gasless via paymaster). */
    setAckMetadata,
    /** Status of the most recent write operation. */
    writeStatus: finalWriteStatus,
    /** Error from the most recent write, if any. */
    writeError,
    /** Transaction hash of the most recent write. */
    writeTxHash,
    /** Whether a write is currently in progress. */
    isWriting:
      finalWriteStatus === 'confirming' || finalWriteStatus === 'waiting',
    /** Reset write state back to idle. */
    resetWriteState,
  };
}
