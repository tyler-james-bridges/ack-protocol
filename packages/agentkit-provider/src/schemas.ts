import { z } from 'zod';

/**
 * Input schema for searching ERC-8004 agents via 8004scan.
 */
export const SearchAgentsSchema = z
  .object({
    query: z.string().describe('Search query for agent names or descriptions'),
    chainId: z
      .number()
      .optional()
      .describe(
        'Chain ID to filter results (2741=Abstract, 8453=Base, 1=Ethereum). Omit for all chains.'
      ),
    limit: z
      .number()
      .optional()
      .default(10)
      .describe('Maximum number of results to return'),
  })
  .describe('Search for ERC-8004 agents by name or description');

/**
 * Input schema for getting detailed agent info.
 */
export const GetAgentSchema = z
  .object({
    chainId: z
      .number()
      .describe(
        'Chain ID where the agent is registered (e.g. 2741 for Abstract)'
      ),
    tokenId: z.number().describe('Agent token ID on the Identity Registry'),
  })
  .describe('Get detailed information about a specific ERC-8004 agent');

/**
 * Input schema for getting agent reputation breakdown.
 */
export const GetReputationSchema = z
  .object({
    chainId: z.number().describe('Chain ID where the agent is registered'),
    tokenId: z.number().describe('Agent token ID'),
  })
  .describe('Get reputation breakdown for an ERC-8004 agent');

/**
 * Input schema for getting feedback list for an agent.
 */
export const GetAgentFeedbacksSchema = z
  .object({
    chainId: z.number().describe('Chain ID where the agent is registered'),
    tokenId: z.number().describe('Agent token ID'),
    limit: z
      .number()
      .optional()
      .default(20)
      .describe('Maximum number of feedbacks to return'),
  })
  .describe('Get feedback/kudos list for an ERC-8004 agent');

/**
 * Input schema for giving onchain kudos to an agent.
 */
export const GiveKudosSchema = z
  .object({
    agentId: z.number().describe('Token ID of the agent to give kudos to'),
    value: z
      .number()
      .int()
      .min(0)
      .max(100)
      .describe('Kudos score from 0-100 (integer, stored with 0 decimals)'),
    tag1: z
      .string()
      .optional()
      .default('')
      .describe(
        'Primary category tag: reliability, speed, accuracy, creativity, collaboration, security, starred'
      ),
    tag2: z
      .string()
      .optional()
      .default('')
      .describe("Secondary tag (freeform, e.g. 'great response time')"),
  })
  .describe(
    'Give onchain kudos/feedback to an ERC-8004 agent via the Reputation Registry'
  );

/**
 * Input schema for registering a new ERC-8004 agent.
 */
export const RegisterAgentSchema = z
  .object({
    agentURI: z
      .string()
      .describe(
        'Agent metadata URI (IPFS, HTTPS, or data: URI) containing agent name, description, and services'
      ),
  })
  .describe('Register a new ERC-8004 agent on the Identity Registry');

/**
 * Input schema for updating an agent's metadata URI.
 */
export const UpdateAgentURISchema = z
  .object({
    agentId: z.number().describe('Agent token ID to update'),
    newURI: z
      .string()
      .describe('New agent metadata URI (IPFS, HTTPS, or data: URI)'),
  })
  .describe('Update the metadata URI of an existing ERC-8004 agent');

/**
 * Input schema for tipping an agent with USDC via x402.
 */
export const TipAgentSchema = z
  .object({
    chainId: z
      .number()
      .describe('Chain ID of the agent to tip (e.g. 2741 for Abstract)'),
    agentId: z.number().describe('Token ID of the agent to tip'),
    amount: z
      .number()
      .min(0.01)
      .max(100)
      .describe('Tip amount in USDC (min 0.01, max 100)'),
    message: z
      .string()
      .optional()
      .describe('Optional message to include with the tip'),
  })
  .describe(
    'Give x402 tipped kudos to an agent (real USDC payment backing the endorsement)'
  );

/**
 * Input schema for getting trust categories.
 */
export const GetTrustCategoriesSchema = z
  .object({})
  .describe('Get the 6 ERC-8004 trust categories with descriptions');

/**
 * Input schema for getting the agent leaderboard.
 */
export const GetLeaderboardSchema = z
  .object({
    chainId: z
      .number()
      .optional()
      .default(2741)
      .describe('Chain ID to get leaderboard for (default 2741 for Abstract)'),
    limit: z
      .number()
      .optional()
      .default(10)
      .describe('Number of top agents to return (default 10)'),
  })
  .describe('Get the top ERC-8004 agents by star count on a given chain');

/**
 * Input schema for comparing two agents.
 */
export const CompareAgentsSchema = z
  .object({
    chainIdA: z.number().describe('Chain ID of the first agent'),
    tokenIdA: z.number().describe('Token ID of the first agent'),
    chainIdB: z.number().describe('Chain ID of the second agent'),
    tokenIdB: z.number().describe('Token ID of the second agent'),
  })
  .describe('Compare the reputation of two ERC-8004 agents side by side');
