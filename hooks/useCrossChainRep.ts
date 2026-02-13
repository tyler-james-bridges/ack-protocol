import { useQuery } from '@tanstack/react-query';
import {
  fetchCrossChainReputation,
  type ChainReputation,
} from '@/lib/multichain';

export function useCrossChainRep(agentAddress: string | undefined) {
  const query = useQuery({
    queryKey: ['cross-chain-rep', agentAddress],
    queryFn: () => fetchCrossChainReputation(agentAddress!),
    enabled: !!agentAddress,
    staleTime: 2 * 60 * 1000,
  });

  const chains = query.data ?? [];
  const totalFeedbacks = chains.reduce(
    (sum: number, c: ChainReputation) => sum + c.feedbackCount,
    0
  );

  return {
    chains,
    totalFeedbacks,
    isLoading: query.isLoading,
    error: query.error,
  };
}
