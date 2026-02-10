'use client';

import { useEffect, useState } from 'react';
import { useAgentOwner, useAgentURI, useAgentWallet } from './useAgentRegistry';
import { fetchFromIPFS, ipfsToHttp } from '@/lib/ipfs';
import type { AgentIdentity, AgentRegistrationFile } from '@/lib/types';
import { ABSTRACT_CHAIN_ID } from '@/config/chain';

/**
 * Fully resolved agent profile — on-chain identity + off-chain registration file.
 * Fetches tokenURI, resolves the JSON, and returns a unified AgentIdentity.
 */
export function useAgentProfile(agentId: number | undefined) {
  const [registration, setRegistration] =
    useState<AgentRegistrationFile | null>(null);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [registrationError, setRegistrationError] = useState<Error | null>(
    null
  );

  const owner = useAgentOwner(agentId);
  const uri = useAgentURI(agentId);
  const wallet = useAgentWallet(agentId);

  const agentURI = uri.data as string | undefined;

  // Fetch and parse the off-chain registration file
  useEffect(() => {
    if (!agentURI) {
      setRegistration(null);
      return;
    }

    let cancelled = false;
    setRegistrationLoading(true);
    setRegistrationError(null);

    (async () => {
      try {
        const data = await fetchFromIPFS<AgentRegistrationFile>(agentURI);
        if (!cancelled) {
          setRegistration(data);
        }
      } catch (err) {
        if (!cancelled) {
          setRegistrationError(
            err instanceof Error ? err : new Error(String(err))
          );
          setRegistration(null);
        }
      } finally {
        if (!cancelled) {
          setRegistrationLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [agentURI]);

  const isLoading =
    owner.isLoading || uri.isLoading || wallet.isLoading || registrationLoading;
  const error = owner.error || uri.error || wallet.error || registrationError;

  const profile: AgentIdentity | null =
    agentId !== undefined && owner.data && agentURI
      ? {
          agentId,
          owner: owner.data,
          agentURI,
          chainId: ABSTRACT_CHAIN_ID,
          registration,
          wallet: (wallet.data as `0x${string}`) ?? null,
        }
      : null;

  return {
    profile,
    isLoading,
    error,
    refetch: () => {
      owner.refetch();
      uri.refetch();
      wallet.refetch();
    },
  };
}

/**
 * Resolve an agent's display image from its registration file.
 * Handles IPFS URIs, HTTP URLs, and missing images.
 */
export function resolveAgentImage(
  registration: AgentRegistrationFile | null
): string | null {
  if (!registration?.image) return null;
  return ipfsToHttp(registration.image);
}
