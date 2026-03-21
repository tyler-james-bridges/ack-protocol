import { z } from 'zod';
import { ActionProvider } from '@coinbase/agentkit';
import { EvmWalletProvider } from '@coinbase/agentkit';
import { CreateAction } from '@coinbase/agentkit';
import { Network } from '@coinbase/agentkit';
import { encodeFunctionData } from 'viem';
import {
  SearchAgentsSchema,
  GetAgentSchema,
  GetReputationSchema,
  GetAgentFeedbacksSchema,
  GiveKudosSchema,
  RegisterAgentSchema,
  UpdateAgentURISchema,
  TipAgentSchema,
  GetTrustCategoriesSchema,
  GetLeaderboardSchema,
  CompareAgentsSchema,
} from './schemas';
import {
  API_BASE_URL,
  ACK_API_BASE_URL,
  IDENTITY_REGISTRY_ADDRESS,
  IDENTITY_REGISTRY_ABI,
  REPUTATION_REGISTRY_ADDRESS,
  REPUTATION_REGISTRY_ABI,
} from './constants';

/**
 * AckActionProvider lets AgentKit agents interact with ACK Protocol (ERC-8004).
 *
 * Read actions use the 8004scan public API. Write actions send onchain
 * transactions to the Identity Registry and Reputation Registry contracts.
 */
export class AckActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super('ack', []);
  }

  /**
   * Search for ERC-8004 agents by name or description.
   */
  @CreateAction({
    name: 'search_agents',
    description: `
Search for ERC-8004 agents on 8004scan by name or description.
Returns a list of matching agents with their chain ID, token ID, name, score, and protocols.
Useful for discovering agents across Abstract, Base, Ethereum, and other EVM chains.
`,
    schema: SearchAgentsSchema,
  })
  async searchAgents(
    _walletProvider: EvmWalletProvider,
    args: z.infer<typeof SearchAgentsSchema>
  ): Promise<string> {
    try {
      const params = new URLSearchParams({ q: args.query });
      if (args.chainId !== undefined) {
        params.set('chainId', String(args.chainId));
      }
      if (args.limit !== undefined) {
        params.set('limit', String(args.limit));
      }

      const response = await fetch(
        `${API_BASE_URL}/agents/search?${params.toString()}`
      );
      if (!response.ok) {
        return `Error searching agents: ${response.status} ${response.statusText}`;
      }

      const data = (await response.json()) as Record<string, unknown>;
      const agents = (data.agents ?? data.data ?? data) as Record<
        string,
        unknown
      >[];

      if (!Array.isArray(agents) || agents.length === 0) {
        return `No agents found for query "${args.query}"`;
      }

      const results = agents.map(
        (a: Record<string, unknown>) =>
          `- ${a.name ?? 'Unknown'} (chain ${a.chainId}, token ${a.tokenId}) - score: ${a.score ?? 'N/A'}`
      );

      return `Found ${agents.length} agent(s) matching "${args.query}":\n${results.join('\n')}`;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return `Error searching agents: ${msg}`;
    }
  }

  /**
   * Get detailed info about a specific ERC-8004 agent.
   */
  @CreateAction({
    name: 'get_agent',
    description: `
Get detailed information about a specific ERC-8004 agent by chain ID and token ID.
Returns the agent's name, description, rank, score, services, and protocols.
`,
    schema: GetAgentSchema,
  })
  async getAgent(
    _walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetAgentSchema>
  ): Promise<string> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/agents/${args.chainId}/${args.tokenId}`
      );
      if (!response.ok) {
        return `Error getting agent: ${response.status} ${response.statusText}`;
      }

      const data = (await response.json()) as Record<string, unknown>;
      // The 8004scan API response shape varies: some endpoints wrap in `.agent`,
      // others in `.data`, or return the object directly. Defensive unwrapping
      // handles all known variants.
      const agent = (data.agent ?? data.data ?? data) as Record<
        string,
        unknown
      >;

      return [
        `Agent: ${agent.name ?? 'Unknown'} (chain ${args.chainId}, token ${args.tokenId})`,
        agent.description ? `Description: ${agent.description}` : null,
        agent.rank !== undefined ? `Rank: #${agent.rank}` : null,
        agent.score !== undefined ? `Score: ${agent.score}` : null,
        Array.isArray(agent.protocols) && agent.protocols.length
          ? `Protocols: ${(agent.protocols as string[]).join(', ')}`
          : null,
        Array.isArray(agent.services) && agent.services.length
          ? `Services: ${(agent.services as string[]).join(', ')}`
          : null,
      ]
        .filter(Boolean)
        .join('\n');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return `Error getting agent: ${msg}`;
    }
  }

  /**
   * Get an agent's reputation breakdown.
   */
  @CreateAction({
    name: 'get_reputation',
    description: `
Get the reputation breakdown for an ERC-8004 agent.
Returns total score, feedback count, average score, and health status from 8004scan.
`,
    schema: GetReputationSchema,
  })
  async getReputation(
    _walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetReputationSchema>
  ): Promise<string> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/agents/${args.chainId}/${args.tokenId}`
      );
      if (!response.ok) {
        return `Error getting reputation: ${response.status} ${response.statusText}`;
      }

      const data = (await response.json()) as Record<string, unknown>;
      // Defensive unwrap: API may nest under .agent, .data, or return flat
      const agent = (data.agent ?? data.data ?? data) as Record<
        string,
        unknown
      >;

      return [
        `Reputation for ${agent.name ?? `agent ${args.tokenId}`} (chain ${args.chainId}):`,
        agent.score !== undefined ? `Overall score: ${agent.score}` : null,
        agent.rank !== undefined ? `Rank: #${agent.rank}` : null,
        agent.feedbackCount !== undefined
          ? `Feedback count: ${agent.feedbackCount}`
          : null,
        agent.averageScore !== undefined
          ? `Average feedback score: ${agent.averageScore}`
          : null,
        agent.health !== undefined ? `Health status: ${agent.health}` : null,
        agent.star_count !== undefined || agent.starCount !== undefined
          ? `Star count: ${agent.star_count ?? agent.starCount}`
          : null,
        Array.isArray(agent.trustCategories) && agent.trustCategories.length
          ? `Trust categories: ${(agent.trustCategories as string[]).join(', ')}`
          : null,
        agent.lastFeedbackAt !== undefined
          ? `Last feedback: ${agent.lastFeedbackAt}`
          : null,
      ]
        .filter(Boolean)
        .join('\n');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return `Error getting reputation: ${msg}`;
    }
  }

  /**
   * Get the feedback list for a specific agent.
   */
  @CreateAction({
    name: 'get_agent_feedbacks',
    description: `
Get the list of feedback/kudos that have been given to an ERC-8004 agent.
Returns feedback entries with scores, tags, and timestamps.
`,
    schema: GetAgentFeedbacksSchema,
  })
  async getAgentFeedbacks(
    _walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetAgentFeedbacksSchema>
  ): Promise<string> {
    try {
      const params = new URLSearchParams({
        chainId: String(args.chainId),
        tokenId: String(args.tokenId),
      });
      if (args.limit !== undefined) {
        params.set('limit', String(args.limit));
      }

      const response = await fetch(
        `${API_BASE_URL}/feedbacks?${params.toString()}`
      );
      if (!response.ok) {
        return `Error getting feedbacks: ${response.status} ${response.statusText}`;
      }

      const data = (await response.json()) as Record<string, unknown>;
      const feedbacks = (data.feedbacks ?? data.data ?? data) as Record<
        string,
        unknown
      >[];

      if (!Array.isArray(feedbacks) || feedbacks.length === 0) {
        return `No feedback found for agent ${args.tokenId} on chain ${args.chainId}`;
      }

      const entries = feedbacks.map(
        (f: Record<string, unknown>) =>
          `- Score: ${f.value ?? 'N/A'} | Tags: ${f.tag1 ?? ''}${f.tag2 ? `, ${f.tag2}` : ''} | From: ${f.clientAddress ?? 'unknown'}`
      );

      return `Found ${feedbacks.length} feedback(s) for agent ${args.tokenId}:\n${entries.join('\n')}`;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return `Error getting feedbacks: ${msg}`;
    }
  }

  /**
   * Give onchain kudos to an agent via the Reputation Registry.
   */
  @CreateAction({
    name: 'give_kudos',
    description: `
Give onchain kudos/feedback to an ERC-8004 agent by calling giveFeedback() on the Reputation Registry.
The wallet must be connected to the same chain as the target agent.
Score is 0-100 (stored with 0 decimals). You cannot give kudos to your own agent.
Common tags: reliability, speed, accuracy, creativity, collaboration, security, starred.
`,
    schema: GiveKudosSchema,
  })
  async giveKudos(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GiveKudosSchema>
  ): Promise<string> {
    try {
      const data = encodeFunctionData({
        abi: REPUTATION_REGISTRY_ABI,
        functionName: 'giveFeedback',
        args: [
          BigInt(args.agentId),
          BigInt(args.value),
          0, // valueDecimals
          args.tag1 ?? '',
          args.tag2 ?? '',
          '', // endpoint
          '', // feedbackURI
          '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`, // feedbackHash
        ],
      });

      const hash = await walletProvider.sendTransaction({
        to: REPUTATION_REGISTRY_ADDRESS as `0x${string}`,
        data,
      });

      await walletProvider.waitForTransactionReceipt(hash);

      return `Successfully gave ${args.value} kudos to agent ${args.agentId} on the connected chain with tag "${args.tag1 ?? ''}". Transaction: ${hash}`;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return `Error giving kudos to agent ${args.agentId}: ${msg}`;
    }
  }

  /**
   * Register a new ERC-8004 agent on the Identity Registry.
   */
  @CreateAction({
    name: 'register_agent',
    description: `
Register a new ERC-8004 agent on the Identity Registry.
The agent URI should contain metadata (name, description, services) as an IPFS, HTTPS, or data: URI.
The wallet's connected chain will be used for registration.
Returns the transaction hash on success.
`,
    schema: RegisterAgentSchema,
  })
  async registerAgent(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof RegisterAgentSchema>
  ): Promise<string> {
    try {
      const data = encodeFunctionData({
        abi: IDENTITY_REGISTRY_ABI,
        functionName: 'register',
        args: [args.agentURI],
      });

      const hash = await walletProvider.sendTransaction({
        to: IDENTITY_REGISTRY_ADDRESS as `0x${string}`,
        data,
      });

      await walletProvider.waitForTransactionReceipt(hash);

      return `Successfully registered new agent on the connected chain. Transaction: ${hash}. Check the transaction receipt logs for the new agent token ID.`;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return `Error registering agent: ${msg}`;
    }
  }

  /**
   * Update an existing agent's metadata URI.
   */
  @CreateAction({
    name: 'update_agent_uri',
    description: `
Update the metadata URI of an existing ERC-8004 agent on the Identity Registry.
You must own the agent or be an approved operator to update it.
The wallet's connected chain will be used.
`,
    schema: UpdateAgentURISchema,
  })
  async updateAgentUri(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof UpdateAgentURISchema>
  ): Promise<string> {
    try {
      const data = encodeFunctionData({
        abi: IDENTITY_REGISTRY_ABI,
        functionName: 'setAgentURI',
        args: [BigInt(args.agentId), args.newURI],
      });

      const hash = await walletProvider.sendTransaction({
        to: IDENTITY_REGISTRY_ADDRESS as `0x${string}`,
        data,
      });

      await walletProvider.waitForTransactionReceipt(hash);

      return `Successfully updated agent ${args.agentId} URI to "${args.newURI}" on the connected chain. Transaction: ${hash}`;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return `Error updating agent URI: ${msg}`;
    }
  }

  /**
   * Tip an agent with USDC via x402.
   */
  @CreateAction({
    name: 'tip_agent',
    description: `
Give x402 tipped kudos to an ERC-8004 agent (real USDC payment backing the endorsement).
Creates a pending tip that the agent owner can claim. Amount is in USDC (min $0.01, max $100).
Returns a tip ID and payment URL on success.
`,
    schema: TipAgentSchema,
  })
  async tipAgent(
    _walletProvider: EvmWalletProvider,
    args: z.infer<typeof TipAgentSchema>
  ): Promise<string> {
    try {
      const body: Record<string, unknown> = {
        agentId: args.agentId,
        chainId: args.chainId,
        amount: args.amount,
      };
      if (args.message) {
        body.message = args.message;
      }

      const response = await fetch(`${ACK_API_BASE_URL}/api/tips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return `Error tipping agent: ${response.status} ${response.statusText} - ${errorText}`;
      }

      const data = (await response.json()) as Record<string, unknown>;
      const tipId = data.tipId ?? data.id ?? 'unknown';

      return [
        `Successfully created tip of $${args.amount} USDC for agent ${args.agentId} on chain ${args.chainId}.`,
        `Tip ID: ${tipId}`,
        args.message ? `Message: "${args.message}"` : null,
        data.paymentUrl ? `Payment URL: ${data.paymentUrl}` : null,
      ]
        .filter(Boolean)
        .join('\n');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return `Error tipping agent ${args.agentId}: ${msg}`;
    }
  }

  /**
   * Get the 6 ERC-8004 trust categories.
   */
  @CreateAction({
    name: 'get_trust_categories',
    description: `
Get the 6 ERC-8004 trust categories with descriptions.
Use these categories when giving kudos to agents to classify the type of feedback.
`,
    schema: GetTrustCategoriesSchema,
  })
  async getTrustCategories(
    _walletProvider: EvmWalletProvider,
    _args: z.infer<typeof GetTrustCategoriesSchema>
  ): Promise<string> {
    return [
      'ERC-8004 Trust Categories:',
      '',
      '1. reliability - Consistent, dependable performance. Use when an agent delivers stable results over time without failures or downtime.',
      '2. speed - Fast response times and execution. Use when an agent processes requests or completes tasks notably quickly.',
      '3. accuracy - Correct, precise outputs. Use when an agent produces highly accurate results with minimal errors.',
      '4. creativity - Novel approaches and solutions. Use when an agent demonstrates innovative problem-solving or unique outputs.',
      '5. collaboration - Works well with other agents. Use when an agent integrates smoothly in multi-agent workflows or communicates effectively.',
      '6. security - Safe, trustworthy behavior. Use when an agent handles sensitive data properly and operates without introducing risks.',
    ].join('\n');
  }

  /**
   * Get the agent leaderboard for a chain.
   */
  @CreateAction({
    name: 'get_leaderboard',
    description: `
Get the top ERC-8004 agents by star count on a given chain from 8004scan.
Defaults to Abstract (chain 2741) and top 10 agents.
`,
    schema: GetLeaderboardSchema,
  })
  async getLeaderboard(
    _walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetLeaderboardSchema>
  ): Promise<string> {
    try {
      const chainId = args.chainId ?? 2741;
      const limit = args.limit ?? 10;

      const params = new URLSearchParams({
        chainId: String(chainId),
        sort: 'star_count',
        order: 'desc',
        limit: String(limit),
      });

      const response = await fetch(
        `${API_BASE_URL}/agents?${params.toString()}`
      );
      if (!response.ok) {
        return `Error getting leaderboard: ${response.status} ${response.statusText}`;
      }

      const data = (await response.json()) as Record<string, unknown>;
      const agents = (data.agents ?? data.data ?? data) as Record<
        string,
        unknown
      >[];

      if (!Array.isArray(agents) || agents.length === 0) {
        return `No agents found on chain ${chainId}`;
      }

      const entries = agents.map(
        (a: Record<string, unknown>, i: number) =>
          `${i + 1}. ${a.name ?? 'Unknown'} (token ${a.tokenId}) - stars: ${a.star_count ?? a.starCount ?? 'N/A'}, score: ${a.score ?? 'N/A'}`
      );

      return `Top ${agents.length} agents on chain ${chainId}:\n${entries.join('\n')}`;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return `Error getting leaderboard: ${msg}`;
    }
  }

  /**
   * Compare reputation of two agents side by side.
   */
  @CreateAction({
    name: 'compare_agents',
    description: `
Compare the reputation of two ERC-8004 agents side by side.
Takes two agent identifiers (chainId + tokenId for each) and returns a comparison
of their scores, ranks, feedback counts, and other reputation data.
`,
    schema: CompareAgentsSchema,
  })
  async compareAgents(
    _walletProvider: EvmWalletProvider,
    args: z.infer<typeof CompareAgentsSchema>
  ): Promise<string> {
    try {
      const [responseA, responseB] = await Promise.all([
        fetch(`${API_BASE_URL}/agents/${args.chainIdA}/${args.tokenIdA}`),
        fetch(`${API_BASE_URL}/agents/${args.chainIdB}/${args.tokenIdB}`),
      ]);

      if (!responseA.ok) {
        return `Error fetching agent A (chain ${args.chainIdA}, token ${args.tokenIdA}): ${responseA.status} ${responseA.statusText}`;
      }
      if (!responseB.ok) {
        return `Error fetching agent B (chain ${args.chainIdB}, token ${args.tokenIdB}): ${responseB.status} ${responseB.statusText}`;
      }

      const dataA = (await responseA.json()) as Record<string, unknown>;
      const dataB = (await responseB.json()) as Record<string, unknown>;
      // Defensive unwrap: API may nest under .agent, .data, or return flat
      const agentA = (dataA.agent ?? dataA.data ?? dataA) as Record<
        string,
        unknown
      >;
      const agentB = (dataB.agent ?? dataB.data ?? dataB) as Record<
        string,
        unknown
      >;

      const nameA = (agentA.name as string) ?? `Agent ${args.tokenIdA}`;
      const nameB = (agentB.name as string) ?? `Agent ${args.tokenIdB}`;

      const formatAgent = (
        agent: Record<string, unknown>,
        name: string,
        chainId: number,
        tokenId: number
      ) =>
        [
          `  Name: ${name}`,
          `  Chain: ${chainId}, Token: ${tokenId}`,
          agent.score !== undefined ? `  Score: ${agent.score}` : null,
          agent.rank !== undefined ? `  Rank: #${agent.rank}` : null,
          agent.feedbackCount !== undefined
            ? `  Feedback count: ${agent.feedbackCount}`
            : null,
          agent.averageScore !== undefined
            ? `  Average score: ${agent.averageScore}`
            : null,
          agent.health !== undefined ? `  Health: ${agent.health}` : null,
        ]
          .filter(Boolean)
          .join('\n');

      return [
        `Agent Comparison:`,
        ``,
        `--- ${nameA} ---`,
        formatAgent(agentA, nameA, args.chainIdA, args.tokenIdA),
        ``,
        `--- ${nameB} ---`,
        formatAgent(agentB, nameB, args.chainIdB, args.tokenIdB),
      ].join('\n');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return `Error comparing agents: ${msg}`;
    }
  }

  /**
   * Any EVM chain is supported since the Identity Registry uses the same address everywhere.
   */
  supportsNetwork = (network: Network) => network.protocolFamily === 'evm';
}

/**
 * Factory function to create an AckActionProvider instance.
 */
export const ackActionProvider = () => new AckActionProvider();
