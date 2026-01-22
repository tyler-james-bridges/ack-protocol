'use client';

import { useWriteContractSponsored, useAbstractClient } from '@abstract-foundation/agw-react';
import { useCallback, useState, useMemo } from 'react';
import { type Address, createPublicClient, http } from 'viem';
import { getGeneralPaymasterInput } from 'viem/zksync';
import { chain } from '@/config/chain';
import { CONTRACT_ADDRESS, PAYMASTER_ADDRESS, isContractDeployed } from '@/config/contract';
import { KUDOS_CONTRACT_ABI } from '@/config/abi';
import { useAccount } from 'wagmi';

export interface UserData {
  xHandle: string;
  walletAddress: Address;
  kudosReceived: number;
  kudosGiven: number;
  isRegistered: boolean;
  registeredAt?: number;
  deletionRequestedAt?: number;
  isPrivate?: boolean;
}

export interface KudosTransaction {
  from: Address;
  to: Address;
  fromHandle: string;
  toHandle: string;
  timestamp: number;
  tweetUrl: string;
}

export interface LeaderboardEntry {
  handle: string;
  kudosReceived: number;
  address: Address;
}

export function useKudos() {
  const { data: abstractClient } = useAbstractClient();
  const { address } = useAccount();
  const {
    writeContractSponsoredAsync,
    error,
    isPending,
    isSuccess
  } = useWriteContractSponsored();

  const [lastAction, setLastAction] = useState<'register' | 'kudos' | 'delete' | 'privacy' | null>(null);

  // Create a single publicClient instance for the hook
  const publicClient = useMemo(() => createPublicClient({
    chain: chain,
    transport: http()
  }), []);

  const checkUserRegistration = useCallback(async (userAddress?: Address): Promise<UserData | null> => {
    const addressToCheck = userAddress || address;
    if (!addressToCheck) return null;

    try {
      // Get user data
      const result = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: KUDOS_CONTRACT_ABI,
        functionName: 'users',
        args: [addressToCheck]
      });

      // Get privacy status
      const isPrivate = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: KUDOS_CONTRACT_ABI,
        functionName: 'privateProfiles',
        args: [addressToCheck]
      }) as boolean;

      if (result && Array.isArray(result)) {
        const [xHandle, kudosReceived, kudosGiven, isRegistered, registeredAt, deletionRequestedAt] = result;
        if (isRegistered) {
          return {
            xHandle: xHandle as string,
            walletAddress: addressToCheck,
            kudosReceived: Number(kudosReceived),
            kudosGiven: Number(kudosGiven),
            isRegistered: isRegistered as boolean,
            registeredAt: Number(registeredAt),
            deletionRequestedAt: Number(deletionRequestedAt),
            isPrivate
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Error checking registration:', error);
      return null;
    }
  }, [address, publicClient]);

  const checkHandleAvailability = useCallback(async (handle: string): Promise<boolean> => {
    try {
      const result = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: KUDOS_CONTRACT_ABI,
        functionName: 'isHandleAvailable',
        args: [handle]
      });

      return result as boolean;
    } catch (error) {
      console.error('Error checking handle availability:', error);
      return false;
    }
  }, [publicClient]);

  const getKudosHistory = useCallback(async (offset: number = 0, limit: number = 10): Promise<KudosTransaction[]> => {
    try {
      // If contract not deployed, return empty array
      if (!isContractDeployed()) {
        return [];
      }

      const result = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: KUDOS_CONTRACT_ABI,
        functionName: 'getKudosHistoryPage',
        args: [BigInt(offset), BigInt(limit)]
      });

      if (result && Array.isArray(result)) {
        return result.map((tx) => ({
          from: tx.from as Address,
          to: tx.to as Address,
          fromHandle: tx.fromHandle as string,
          toHandle: tx.toHandle as string,
          timestamp: Number(tx.timestamp),
          tweetUrl: tx.tweetUrl as string
        }));
      }
      return [];
    } catch (error) {
      console.error('Error fetching kudos history:', error);
      return [];
    }
  }, [publicClient]);

  const getLeaderboardData = useCallback(async (limit: number = 10): Promise<LeaderboardEntry[]> => {
    try {
      // If contract not deployed, return empty array
      if (!isContractDeployed()) {
        return [];
      }

      const result = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: KUDOS_CONTRACT_ABI,
        functionName: 'getLeaderboard',
        args: [BigInt(limit)]
      });

      if (result && Array.isArray(result) && result.length === 3) {
        const [handles, kudosReceived, addresses] = result as [string[], bigint[], Address[]];
        return handles.map((handle, index) => ({
          handle,
          kudosReceived: Number(kudosReceived[index]),
          address: addresses[index]
        }));
      }
      return [];
    } catch (error) {
      // Silently handle underflow error when leaderboard is empty (known contract bug)
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('underflow') || errorMessage.includes('overflow')) {
        return [];
      }
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }, [publicClient]);

  const registerUser = useCallback(async (xHandle: string) => {
    if (!abstractClient) throw new Error('Wallet not connected');

    setLastAction('register');

    const tx = await writeContractSponsoredAsync({
      address: CONTRACT_ADDRESS,
      abi: KUDOS_CONTRACT_ABI,
      functionName: 'registerUser',
      args: [xHandle],
      paymaster: PAYMASTER_ADDRESS,
      paymasterInput: getGeneralPaymasterInput({
        innerInput: '0x',
      }),
    });

    return tx;
  }, [abstractClient, writeContractSponsoredAsync]);

  const requestAccountDeletion = useCallback(async () => {
    if (!abstractClient) throw new Error('Wallet not connected');

    setLastAction('delete');

    const tx = await writeContractSponsoredAsync({
      address: CONTRACT_ADDRESS,
      abi: KUDOS_CONTRACT_ABI,
      functionName: 'requestAccountDeletion',
      args: [],
      paymaster: PAYMASTER_ADDRESS,
      paymasterInput: getGeneralPaymasterInput({
        innerInput: '0x',
      }),
    });

    return tx;
  }, [abstractClient, writeContractSponsoredAsync]);

  const cancelAccountDeletion = useCallback(async () => {
    if (!abstractClient) throw new Error('Wallet not connected');

    setLastAction('delete');

    const tx = await writeContractSponsoredAsync({
      address: CONTRACT_ADDRESS,
      abi: KUDOS_CONTRACT_ABI,
      functionName: 'cancelAccountDeletion',
      args: [],
      paymaster: PAYMASTER_ADDRESS,
      paymasterInput: getGeneralPaymasterInput({
        innerInput: '0x',
      }),
    });

    return tx;
  }, [abstractClient, writeContractSponsoredAsync]);

  const executeAccountDeletion = useCallback(async (userAddress: Address) => {
    if (!abstractClient) throw new Error('Wallet not connected');

    setLastAction('delete');

    const tx = await writeContractSponsoredAsync({
      address: CONTRACT_ADDRESS,
      abi: KUDOS_CONTRACT_ABI,
      functionName: 'executeAccountDeletion',
      args: [userAddress],
      paymaster: PAYMASTER_ADDRESS,
      paymasterInput: getGeneralPaymasterInput({
        innerInput: '0x',
      }),
    });

    return tx;
  }, [abstractClient, writeContractSponsoredAsync]);

  const setProfilePrivacy = useCallback(async (isPrivate: boolean) => {
    if (!abstractClient) throw new Error('Wallet not connected');

    setLastAction('privacy');

    const tx = await writeContractSponsoredAsync({
      address: CONTRACT_ADDRESS,
      abi: KUDOS_CONTRACT_ABI,
      functionName: 'setProfilePrivacy',
      args: [isPrivate],
      paymaster: PAYMASTER_ADDRESS,
      paymasterInput: getGeneralPaymasterInput({
        innerInput: '0x',
      }),
    });

    return tx;
  }, [abstractClient, writeContractSponsoredAsync]);

  const giveKudos = useCallback(async (toHandle: string, tweetUrl: string) => {
    if (!abstractClient) throw new Error('Wallet not connected');

    setLastAction('kudos');

    const tx = await writeContractSponsoredAsync({
      address: CONTRACT_ADDRESS,
      abi: KUDOS_CONTRACT_ABI,
      functionName: 'giveKudos',
      args: [toHandle, tweetUrl],
      paymaster: PAYMASTER_ADDRESS,
      paymasterInput: getGeneralPaymasterInput({
        innerInput: '0x',
      }),
    });

    return tx;
  }, [abstractClient, writeContractSponsoredAsync]);

  return {
    registerUser,
    giveKudos,
    requestAccountDeletion,
    cancelAccountDeletion,
    executeAccountDeletion,
    setProfilePrivacy,
    checkUserRegistration,
    checkHandleAvailability,
    getKudosHistory,
    getLeaderboardData,
    isPending,
    isSuccess,
    error,
    lastAction,
  };
}
