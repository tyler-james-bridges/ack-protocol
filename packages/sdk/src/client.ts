import {
  createPublicClient,
  createWalletClient,
  http,
  numberToHex,
  decodeAbiParameters,
  toHex,
  keccak256,
  type WalletClient,
  type PublicClient,
  type Address,
  type Hash,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getChainConfig } from './chains.js';
import {
  CONTRACT_ADDRESSES,
  IDENTITY_REGISTRY_ABI,
  REPUTATION_REGISTRY_ABI,
} from './contracts.js';
import {
  AGENT_REGISTRY_CAIP10,
  toCAIP10Address,
  DEPLOYMENT_BLOCKS,
  EVENT_TOPICS,
} from './constants.js';
import { parseFeedbackURI } from './utils.js';
import type {
  ACKConfig,
  Agent,
  Reputation,
  ReputationCategory,
  Feedback,
  RegisterParams,
  KudosParams,
  LeaderboardParams,
  TransactionResult,
  FeedbackCategory,
} from './types.js';

/**
 * Main SDK client for interacting with ACK Protocol
 */
export class ACK {
  private readonly publicClient: PublicClient;
  private readonly walletClient?: WalletClient;
  private readonly config: ACKConfig;
  private readonly apiKey?: string;

  private constructor(
    publicClient: PublicClient,
    walletClient: WalletClient | undefined,
    config: ACKConfig
  ) {
    this.publicClient = publicClient;
    this.walletClient = walletClient;
    this.config = config;
    this.apiKey = config.apiKey || process.env.EIGHTOOSCAN_API_KEY;
  }

  /**
   * Create a read-only ACK client
   */
  public static readonly(config: ACKConfig): ACK {
    const chainConfig = getChainConfig(config.chain);
    const publicClient = createPublicClient({
      chain: {
        id: chainConfig.id,
        name: chainConfig.name,
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: {
          default: {
            http: [config.rpcUrl || chainConfig.rpcUrl],
          },
        },
      },
      transport: http(),
    });

    return new ACK(publicClient, undefined, config);
  }

  /**
   * Create an ACK client from a private key
   */
  public static fromPrivateKey(privateKey: string, config: ACKConfig): ACK {
    const chainConfig = getChainConfig(config.chain);
    const account = privateKeyToAccount(privateKey as Hash);

    const chain = {
      id: chainConfig.id,
      name: chainConfig.name,
      nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
      rpcUrls: {
        default: {
          http: [config.rpcUrl || chainConfig.rpcUrl],
        },
      },
    };

    const publicClient = createPublicClient({
      chain,
      transport: http(),
    });

    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(),
    });

    return new ACK(publicClient, walletClient, config);
  }

  /**
   * Create an ACK client from a viem wallet client
   */
  public static fromWalletClient(
    walletClient: WalletClient,
    config: ACKConfig
  ): ACK {
    const chainConfig = getChainConfig(config.chain);

    const publicClient = createPublicClient({
      chain: {
        id: chainConfig.id,
        name: chainConfig.name,
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: {
          default: {
            http: [config.rpcUrl || chainConfig.rpcUrl],
          },
        },
      },
      transport: http(),
    });

    return new ACK(publicClient, walletClient, config);
  }

  // ---------------------------------------------------------------------------
  // Read methods
  // ---------------------------------------------------------------------------

  /**
   * Get agent information by ID
   */
  public async getAgent(agentId: number): Promise<Agent | null> {
    try {
      if (this.apiKey) {
        const chainConfig = getChainConfig(this.config.chain);
        const data = await this.apiCall(`/agents/${chainConfig.id}/${agentId}`);
        return {
          id: Number(data.token_id),
          name: data.name || `Agent ${agentId}`,
          description: data.description || '',
          owner: data.owner_address as Address,
          tokenURI: data.raw_metadata?.offchain_uri,
          registeredAt: data.created_block_number,
        };
      }

      return await this.getAgentFromContract(agentId);
    } catch (error) {
      console.warn(`Failed to get agent ${agentId}:`, error);
      return null;
    }
  }

  /**
   * Get reputation data for an agent
   */
  public async reputation(agentId: number): Promise<Reputation | null> {
    try {
      if (this.apiKey) {
        const chainConfig = getChainConfig(this.config.chain);
        const data = await this.apiCall(`/agents/${chainConfig.id}/${agentId}`);
        const scores = data.scores || {};
        return {
          agentId,
          qualityScore: scores.quality || data.quality_score || 0,
          totalFeedbacks: data.total_feedbacks || 0,
          averageRating: data.average_score || 0,
          categories: [],
        };
      }

      return await this.getReputationFromContract(agentId);
    } catch (error) {
      console.warn(`Failed to get reputation for agent ${agentId}:`, error);
      return null;
    }
  }

  /**
   * Get all feedback for an agent
   */
  public async feedbacks(agentId: number): Promise<Feedback[]> {
    try {
      if (this.apiKey) {
        const chainConfig = getChainConfig(this.config.chain);
        const data = await this.apiCall(
          `/feedbacks?chain_id=${chainConfig.id}&agent_token_id=${agentId}&limit=50`
        );
        const items = data.items || data || [];
        return items.map((f: Record<string, unknown>) => {
          let message = '';
          const uri = String(f.feedback_uri || '');
          const parsed = parseFeedbackURI(uri);
          if (parsed) {
            message = String(parsed.reasoning || parsed.message || '');
          }

          return {
            id: String(f.id || ''),
            agentId,
            from: (f.user_address || f.giver_address || '') as Address,
            category: (f.tag2 ||
              f.category ||
              'reliability') as FeedbackCategory,
            score: Number(f.score || f.value || 0),
            message,
            timestamp: Number(
              f.created_at
                ? new Date(f.created_at as string).getTime() / 1000
                : 0
            ),
            transactionHash: (f.transaction_hash || '0x') as Hash,
          };
        });
      }

      return await this.getFeedbacksFromEvents(agentId);
    } catch (error) {
      console.warn(`Failed to get feedbacks for agent ${agentId}:`, error);
      return [];
    }
  }

  /**
   * Search for agents (requires API key)
   */
  public async search(
    query: string,
    params: { limit?: number; offset?: number } = {}
  ): Promise<Agent[]> {
    if (!this.apiKey) {
      throw new Error(
        'Search requires API key. Set EIGHTOOSCAN_API_KEY environment variable.'
      );
    }

    try {
      const searchParams = new URLSearchParams({ search: query });
      if (params.limit) searchParams.set('limit', params.limit.toString());
      if (params.offset) searchParams.set('offset', params.offset.toString());

      const chainConfig = getChainConfig(this.config.chain);
      searchParams.set('chain_id', chainConfig.id.toString());

      const data = await this.apiCall(`/agents?${searchParams.toString()}`);
      const items = data.items || [];
      return items.map((a: Record<string, unknown>) => ({
        id: Number(a.token_id),
        name: String(a.name || `Agent ${a.token_id}`),
        description: String(a.description || ''),
        owner: (a.owner_address || '') as Address,
      }));
    } catch (error) {
      console.warn('Search failed:', error);
      return [];
    }
  }

  /**
   * Get agent leaderboard (requires API key)
   */
  public async leaderboard(params: LeaderboardParams = {}): Promise<Agent[]> {
    if (!this.apiKey) {
      throw new Error(
        'Leaderboard requires API key. Set EIGHTOOSCAN_API_KEY environment variable.'
      );
    }

    try {
      const chainConfig = getChainConfig(this.config.chain);
      const searchParams = new URLSearchParams({
        chain_id: chainConfig.id.toString(),
        sort_by: params.sortBy || 'quality_score',
        sort_order: 'desc',
        limit: (params.limit || 20).toString(),
      });
      if (params.offset) searchParams.set('offset', params.offset.toString());

      const data = await this.apiCall(`/agents?${searchParams.toString()}`);
      const items = data.items || [];
      return items.map((a: Record<string, unknown>) => ({
        id: Number(a.token_id),
        name: String(a.name || `Agent ${a.token_id}`),
        description: String(a.description || ''),
        owner: (a.owner_address || '') as Address,
      }));
    } catch (error) {
      console.warn('Leaderboard failed:', error);
      return [];
    }
  }

  /**
   * Get the wallet address associated with an agent token.
   */
  public async getAgentWallet(agentId: number): Promise<Address | null> {
    try {
      const result = await this.publicClient.readContract({
        address: CONTRACT_ADDRESSES.IDENTITY_REGISTRY,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: 'getAgentWallet',
        args: [BigInt(agentId)],
      });
      const addr = result as Address;
      if (addr === '0x0000000000000000000000000000000000000000') return null;
      return addr;
    } catch {
      return null;
    }
  }

  /**
   * Get the total number of registered agents.
   */
  public async totalSupply(): Promise<number> {
    const result = await this.publicClient.readContract({
      address: CONTRACT_ADDRESSES.IDENTITY_REGISTRY,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'totalSupply',
    });
    return Number(result as bigint);
  }

  /**
   * Check if an address has registered at least one agent.
   */
  public async isRegistered(address: string): Promise<boolean> {
    const balance = (await this.publicClient.readContract({
      address: CONTRACT_ADDRESSES.IDENTITY_REGISTRY,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'balanceOf',
      args: [address as Address],
    })) as bigint;
    return balance > BigInt(0);
  }

  /**
   * Get all agents owned by an address.
   */
  public async getAgentsByOwner(address: string): Promise<Agent[]> {
    const balance = (await this.publicClient.readContract({
      address: CONTRACT_ADDRESSES.IDENTITY_REGISTRY,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'balanceOf',
      args: [address as Address],
    })) as bigint;

    const count = Number(balance);
    const agents: Agent[] = [];

    for (let i = 0; i < count; i++) {
      const tokenId = (await this.publicClient.readContract({
        address: CONTRACT_ADDRESSES.IDENTITY_REGISTRY,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: 'tokenOfOwnerByIndex',
        args: [address as Address, BigInt(i)],
      })) as bigint;

      const agent = await this.getAgentFromContract(Number(tokenId));
      if (agent) agents.push(agent);
    }

    return agents;
  }

  /**
   * Get on-chain metadata for an agent by key.
   */
  public async getMetadata(
    agentId: number,
    key: string
  ): Promise<string | null> {
    try {
      const result = (await this.publicClient.readContract({
        address: CONTRACT_ADDRESSES.IDENTITY_REGISTRY,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: 'getMetadata',
        args: [BigInt(agentId), key],
      })) as Hex;
      if (result === '0x' || result.length <= 2) return null;
      // Decode bytes to UTF-8 string
      const bytes = Buffer.from(result.slice(2), 'hex');
      return bytes.toString('utf-8');
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Write methods (require wallet)
  // ---------------------------------------------------------------------------

  /**
   * Register a new agent.
   * Calls register(agentURI) on the IdentityRegistry.
   */
  public async register(params: RegisterParams): Promise<TransactionResult> {
    if (!this.walletClient) {
      throw new Error('Registration requires a wallet client');
    }

    const metadata = {
      type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
      name: params.name,
      description: params.description,
      active: true,
    };
    const metadataURI =
      params.metadataURI ||
      `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString('base64')}`;

    const hash = await this.walletClient.writeContract({
      address: CONTRACT_ADDRESSES.IDENTITY_REGISTRY,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'register',
      args: [metadataURI],
      account: this.walletClient.account!,
      chain: this.walletClient.chain,
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

    return {
      hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
    };
  }

  /**
   * Give kudos/feedback to an agent.
   */
  public async kudos(
    agentId: number,
    params: KudosParams
  ): Promise<TransactionResult> {
    if (!this.walletClient) {
      throw new Error('Giving kudos requires a wallet client');
    }

    const chainConfig = getChainConfig(this.config.chain);

    const tag1 = params.isReview ? 'review' : 'kudos';
    const value = params.isReview ? (params.value ?? 0) : 5;

    const feedbackFile = {
      agentRegistry: AGENT_REGISTRY_CAIP10(chainConfig.id),
      agentId,
      clientAddress: toCAIP10Address(
        this.walletClient.account!.address,
        chainConfig.id
      ),
      createdAt: new Date().toISOString(),
      value: String(value),
      valueDecimals: 0,
      tag1,
      tag2: params.category,
      reasoning: (params.message || '').trim(),
      ...(params.fromAgentId !== undefined && {
        fromAgentId: params.fromAgentId,
      }),
    };

    const jsonStr = JSON.stringify(feedbackFile);
    const feedbackURI = `data:application/json;base64,${Buffer.from(jsonStr).toString('base64')}`;
    const feedbackHash = keccak256(toHex(jsonStr));

    const hash = await this.walletClient.writeContract({
      address: CONTRACT_ADDRESSES.REPUTATION_REGISTRY,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: 'giveFeedback',
      args: [
        BigInt(agentId),
        BigInt(value),
        0,
        tag1,
        params.category,
        '', // endpoint
        feedbackURI,
        feedbackHash,
      ],
      account: this.walletClient.account!,
      chain: this.walletClient.chain,
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

    return {
      hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
    };
  }

  /**
   * Set the agent URI for an agent you own.
   */
  public async setAgentURI(
    agentId: number,
    uri: string
  ): Promise<TransactionResult> {
    if (!this.walletClient) {
      throw new Error('setAgentURI requires a wallet client');
    }

    const hash = await this.walletClient.writeContract({
      address: CONTRACT_ADDRESSES.IDENTITY_REGISTRY,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'setAgentURI',
      args: [BigInt(agentId), uri],
      account: this.walletClient.account!,
      chain: this.walletClient.chain,
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

    return {
      hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
    };
  }

  /**
   * Revoke a feedback entry you previously gave.
   */
  public async revokeFeedback(
    agentId: number,
    clientAddress: Address,
    feedbackIndex: number
  ): Promise<TransactionResult> {
    if (!this.walletClient) {
      throw new Error('revokeFeedback requires a wallet client');
    }

    const hash = await this.walletClient.writeContract({
      address: CONTRACT_ADDRESSES.REPUTATION_REGISTRY,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: 'revokeFeedback',
      args: [BigInt(agentId), clientAddress, BigInt(feedbackIndex)],
      account: this.walletClient.account!,
      chain: this.walletClient.chain,
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

    return {
      hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
    };
  }

  /**
   * Set on-chain metadata for an agent you own.
   */
  public async setMetadata(
    agentId: number,
    key: string,
    value: string
  ): Promise<TransactionResult> {
    if (!this.walletClient) {
      throw new Error('setMetadata requires a wallet client');
    }

    const valueHex = toHex(value);

    const hash = await this.walletClient.writeContract({
      address: CONTRACT_ADDRESSES.IDENTITY_REGISTRY,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'setMetadata',
      args: [BigInt(agentId), key, valueHex],
      account: this.walletClient.account!,
      chain: this.walletClient.chain,
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

    return {
      hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async apiCall(endpoint: string): Promise<any> {
    if (!this.apiKey) {
      throw new Error('API key required for this operation');
    }

    const response = await fetch(`https://www.8004scan.io/api/v1${endpoint}`, {
      headers: {
        'X-API-Key': this.apiKey,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
  }

  private async getAgentFromContract(agentId: number): Promise<Agent | null> {
    try {
      const [tokenURI, owner] = await Promise.all([
        this.publicClient.readContract({
          address: CONTRACT_ADDRESSES.IDENTITY_REGISTRY,
          abi: IDENTITY_REGISTRY_ABI,
          functionName: 'tokenURI',
          args: [BigInt(agentId)],
        }),
        this.publicClient.readContract({
          address: CONTRACT_ADDRESSES.IDENTITY_REGISTRY,
          abi: IDENTITY_REGISTRY_ABI,
          functionName: 'ownerOf',
          args: [BigInt(agentId)],
        }),
      ]);

      let name = `Agent ${agentId}`;
      let description = '';

      const uri = tokenURI as string;
      const parsed = parseFeedbackURI(uri);
      if (parsed) {
        name = String(parsed.name || name);
        description = String(parsed.description || description);
      } else if (uri.startsWith('data:,')) {
        try {
          const metadata = JSON.parse(decodeURIComponent(uri.slice(6)));
          name = metadata.name || name;
          description = metadata.description || description;
        } catch {
          // ignore
        }
      }

      return {
        id: agentId,
        name,
        description,
        owner: owner as Address,
        tokenURI: uri,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get reputation by scanning NewFeedback events on-chain.
   * Falls back to a zero-reputation result on error.
   */
  private async getReputationFromContract(
    agentId: number
  ): Promise<Reputation | null> {
    try {
      const feedbacks = await this.getFeedbacksFromEvents(agentId);
      if (feedbacks.length === 0) {
        return {
          agentId,
          qualityScore: 0,
          totalFeedbacks: 0,
          averageRating: 0,
          categories: [],
        };
      }

      const totalFeedbacks = feedbacks.length;
      const sumScores = feedbacks.reduce((sum, f) => sum + f.score, 0);
      const averageRating = sumScores / totalFeedbacks;

      // Build category breakdown
      const catMap = new Map<
        FeedbackCategory,
        { total: number; count: number }
      >();
      for (const f of feedbacks) {
        const existing = catMap.get(f.category);
        if (existing) {
          existing.total += f.score;
          existing.count += 1;
        } else {
          catMap.set(f.category, { total: f.score, count: 1 });
        }
      }

      const categories: ReputationCategory[] = [];
      for (const [category, { total, count }] of catMap) {
        categories.push({
          category,
          averageScore: total / count,
          count,
        });
      }

      return {
        agentId,
        qualityScore: averageRating * 20, // Scale to 0-100
        totalFeedbacks,
        averageRating,
        categories,
      };
    } catch {
      return null;
    }
  }

  /**
   * Fetch feedbacks by scanning NewFeedback events from the ReputationRegistry.
   */
  private async getFeedbacksFromEvents(agentId: number): Promise<Feedback[]> {
    try {
      const chainConfig = getChainConfig(this.config.chain);
      const deployBlock = DEPLOYMENT_BLOCKS[chainConfig.id] ?? BigInt(0);

      // Topic[1] is the indexed agentId
      const agentIdHex =
        `0x${BigInt(agentId).toString(16).padStart(64, '0')}` as Hex;

      const rawLogs = (await this.publicClient.request({
        method: 'eth_getLogs',
        params: [
          {
            address: CONTRACT_ADDRESSES.REPUTATION_REGISTRY,
            topics: [EVENT_TOPICS.NEW_FEEDBACK, agentIdHex],
            fromBlock: numberToHex(deployBlock),
            toBlock: 'latest',
          },
        ],
      })) as Array<{
        topics: Hex[];
        data: Hex;
        blockNumber: Hex;
        transactionHash: Hex;
      }>;

      const feedbacks: Feedback[] = [];

      for (const log of rawLogs) {
        try {
          const sender = ('0x' + log.topics[2]!.slice(26)) as Address;

          const decoded = decodeAbiParameters(
            [
              { name: 'feedbackIndex', type: 'uint64' },
              { name: 'value', type: 'int128' },
              { name: 'valueDecimals', type: 'uint8' },
              { name: 'tag1', type: 'string' },
              { name: 'tag2', type: 'string' },
              { name: 'endpoint', type: 'string' },
              { name: 'feedbackURI', type: 'string' },
              { name: 'feedbackHash', type: 'bytes32' },
            ],
            log.data
          );

          const feedbackIndex = decoded[0];
          const value = decoded[1];
          const tag2 = decoded[4];
          const feedbackURIStr = decoded[6];

          let message = '';
          const parsed = parseFeedbackURI(feedbackURIStr);
          if (parsed) {
            message = String(parsed.reasoning || parsed.message || '');
          }

          feedbacks.push({
            id: `${agentId}-${feedbackIndex}`,
            agentId,
            from: sender,
            category: (tag2 || 'reliability') as FeedbackCategory,
            score: Number(value),
            message,
            timestamp: Number(BigInt(log.blockNumber)),
            transactionHash: log.transactionHash as Hash,
          });
        } catch {
          // skip malformed events
        }
      }

      return feedbacks.reverse();
    } catch {
      return [];
    }
  }
}
