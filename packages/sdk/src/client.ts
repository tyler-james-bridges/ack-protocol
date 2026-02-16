import {
  createPublicClient,
  createWalletClient,
  http,
  type WalletClient,
  type PublicClient,
  type Address,
  type Hash,
  keccak256,
  toHex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { getChainConfig } from './chains.js'
import { CONTRACT_ADDRESSES, IDENTITY_REGISTRY_ABI, REPUTATION_REGISTRY_ABI } from './contracts.js'
import type {
  ACKConfig,
  Agent,
  Reputation,
  Feedback,
  RegisterParams,
  KudosParams,
  LeaderboardParams,
  TransactionResult,
  FeedbackCategory,
} from './types.js'

/**
 * Main SDK client for interacting with ACK Protocol
 */
export class ACK {
  private readonly publicClient: PublicClient
  private readonly walletClient?: WalletClient
  private readonly config: ACKConfig
  private readonly apiKey?: string

  private constructor(
    publicClient: PublicClient,
    walletClient: WalletClient | undefined,
    config: ACKConfig
  ) {
    this.publicClient = publicClient
    this.walletClient = walletClient
    this.config = config
    this.apiKey = config.apiKey || process.env.EIGHTOOSCAN_API_KEY
  }

  /**
   * Create a read-only ACK client
   * @param config - Configuration options
   * @returns ACK client instance
   */
  public static readonly(config: ACKConfig): ACK {
    const chainConfig = getChainConfig(config.chain)
    const publicClient = createPublicClient({
      chain: {
        id: chainConfig.id,
        name: chainConfig.name,
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: {
          default: {
            http: [config.rpcUrl || chainConfig.rpcUrl]
          }
        }
      },
      transport: http()
    })

    return new ACK(publicClient, undefined, config)
  }

  /**
   * Create an ACK client from a private key
   * @param privateKey - Private key (0x prefixed hex string)
   * @param config - Configuration options
   * @returns ACK client instance
   */
  public static fromPrivateKey(privateKey: string, config: ACKConfig): ACK {
    const chainConfig = getChainConfig(config.chain)
    const account = privateKeyToAccount(privateKey as Hash)

    const chain = {
      id: chainConfig.id,
      name: chainConfig.name,
      nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
      rpcUrls: {
        default: {
          http: [config.rpcUrl || chainConfig.rpcUrl]
        }
      }
    }

    const publicClient = createPublicClient({
      chain,
      transport: http()
    })

    const walletClient = createWalletClient({
      account,
      chain,
      transport: http()
    })

    return new ACK(publicClient, walletClient, config)
  }

  /**
   * Create an ACK client from a viem wallet client
   * @param walletClient - Viem wallet client
   * @param config - Configuration options
   * @returns ACK client instance
   */
  public static fromWalletClient(walletClient: WalletClient, config: ACKConfig): ACK {
    const chainConfig = getChainConfig(config.chain)

    const publicClient = createPublicClient({
      chain: {
        id: chainConfig.id,
        name: chainConfig.name,
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: {
          default: {
            http: [config.rpcUrl || chainConfig.rpcUrl]
          }
        }
      },
      transport: http()
    })

    return new ACK(publicClient, walletClient, config)
  }

  /**
   * Get agent information by ID
   * @param agentId - Agent ID
   * @returns Agent information
   */
  public async getAgent(agentId: number): Promise<Agent | null> {
    try {
      if (this.apiKey) {
        const chainConfig = getChainConfig(this.config.chain)
        const data = await this.apiCall(`/agents/${chainConfig.id}/${agentId}`)
        return {
          id: Number(data.token_id),
          name: data.name || `Agent ${agentId}`,
          description: data.description || '',
          owner: data.owner_address as Address,
          tokenURI: data.raw_metadata?.offchain_uri,
          registeredAt: data.created_block_number,
        }
      }

      return await this.getAgentFromContract(agentId)
    } catch (error) {
      console.warn(`Failed to get agent ${agentId}:`, error)
      return null
    }
  }

  /**
   * Get reputation data for an agent
   * @param agentId - Agent ID
   * @returns Reputation data
   */
  public async reputation(agentId: number): Promise<Reputation | null> {
    try {
      if (this.apiKey) {
        const chainConfig = getChainConfig(this.config.chain)
        const data = await this.apiCall(`/agents/${chainConfig.id}/${agentId}`)
        const scores = data.scores || {}
        return {
          agentId,
          qualityScore: scores.quality || data.quality_score || 0,
          totalFeedbacks: data.total_feedbacks || 0,
          averageRating: data.average_score || 0,
          categories: [],
        }
      }

      return await this.getReputationFromContract(agentId)
    } catch (error) {
      console.warn(`Failed to get reputation for agent ${agentId}:`, error)
      return null
    }
  }

  /**
   * Get all feedback for an agent
   * @param agentId - Agent ID
   * @returns Array of feedback entries
   */
  public async feedbacks(agentId: number): Promise<Feedback[]> {
    try {
      if (this.apiKey) {
        const chainConfig = getChainConfig(this.config.chain)
        const data = await this.apiCall(`/feedbacks?chain_id=${chainConfig.id}&agent_token_id=${agentId}&limit=50`)
        const items = data.items || data || []
        return items.map((f: Record<string, unknown>) => {
          // Parse message from feedback URI (base64 or raw JSON data URI)
          let message = ''
          const uri = String(f.feedback_uri || '')
          try {
            if (uri.startsWith('data:application/json;base64,')) {
              const decoded = JSON.parse(Buffer.from(uri.split(',')[1] as string, 'base64').toString())
              message = decoded.reasoning || decoded.message || ''
            } else if (uri.startsWith('data:,')) {
              const decoded = JSON.parse(decodeURIComponent(uri.slice(6)))
              message = decoded.reasoning || decoded.message || ''
            }
          } catch { /* ignore parse errors */ }

          return {
            id: String(f.id || ''),
            agentId,
            from: (f.user_address || f.giver_address || '') as Address,
            category: (f.tag2 || f.category || 'reliability') as FeedbackCategory,
            score: Number(f.score || f.value || 0),
            message,
            timestamp: Number(f.created_at ? new Date(f.created_at as string).getTime() / 1000 : 0),
            transactionHash: (f.transaction_hash || '0x') as Hash,
          }
        })
      }

      return await this.getFeedbacksFromContract(agentId)
    } catch (error) {
      console.warn(`Failed to get feedbacks for agent ${agentId}:`, error)
      return []
    }
  }

  /**
   * Search for agents
   * @param query - Search query
   * @param params - Additional search parameters
   * @returns Array of matching agents
   */
  public async search(query: string, params: { limit?: number; offset?: number } = {}): Promise<Agent[]> {
    if (!this.apiKey) {
      throw new Error('Search requires API key. Set EIGHTOOSCAN_API_KEY environment variable.')
    }

    try {
      const searchParams = new URLSearchParams({ search: query })
      if (params.limit) searchParams.set('limit', params.limit.toString())
      if (params.offset) searchParams.set('offset', params.offset.toString())

      const chainConfig = getChainConfig(this.config.chain)
      searchParams.set('chain_id', chainConfig.id.toString())

      const data = await this.apiCall(`/agents?${searchParams.toString()}`)
      const items = data.items || []
      return items.map((a: Record<string, unknown>) => ({
        id: Number(a.token_id),
        name: String(a.name || `Agent ${a.token_id}`),
        description: String(a.description || ''),
        owner: (a.owner_address || '') as Address,
      }))
    } catch (error) {
      console.warn('Search failed:', error)
      return []
    }
  }

  /**
   * Get agent leaderboard
   * @param params - Leaderboard parameters
   * @returns Array of top agents
   */
  public async leaderboard(params: LeaderboardParams = {}): Promise<Agent[]> {
    if (!this.apiKey) {
      throw new Error('Leaderboard requires API key. Set EIGHTOOSCAN_API_KEY environment variable.')
    }

    try {
      const chainConfig = getChainConfig(this.config.chain)
      const searchParams = new URLSearchParams({
        chain_id: chainConfig.id.toString(),
        sort_by: params.sortBy || 'quality_score',
        sort_order: 'desc',
        limit: (params.limit || 20).toString(),
      })
      if (params.offset) searchParams.set('offset', params.offset.toString())

      const data = await this.apiCall(`/agents?${searchParams.toString()}`)
      const items = data.items || []
      return items.map((a: Record<string, unknown>) => ({
        id: Number(a.token_id),
        name: String(a.name || `Agent ${a.token_id}`),
        description: String(a.description || ''),
        owner: (a.owner_address || '') as Address,
      }))
    } catch (error) {
      console.warn('Leaderboard failed:', error)
      return []
    }
  }

  /**
   * Register a new agent (requires wallet)
   * @param params - Registration parameters
   * @returns Transaction result
   */
  public async register(params: RegisterParams): Promise<TransactionResult> {
    if (!this.walletClient) {
      throw new Error('Registration requires a wallet client')
    }

    const metadata = {
      type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
      name: params.name,
      description: params.description,
      active: true,
    }
    const metadataURI = params.metadataURI
      || `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString('base64')}`

    const hash = await this.walletClient.writeContract({
      address: CONTRACT_ADDRESSES.IDENTITY_REGISTRY,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'register',
      args: [this.walletClient.account!.address, metadataURI],
      account: this.walletClient.account!,
      chain: this.walletClient.chain
    })

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

    return {
      hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed
    }
  }

  /**
   * Give kudos/feedback to an agent (requires wallet)
   * @param agentId - Target agent ID
   * @param params - Kudos parameters
   * @returns Transaction result
   */
  public async kudos(agentId: number, params: KudosParams): Promise<TransactionResult> {
    if (!this.walletClient) {
      throw new Error('Giving kudos requires a wallet client')
    }

    const chainConfig = getChainConfig(this.config.chain)

    // Build ERC-8004 compliant feedback file (matches app format exactly)
    const feedbackFile = {
      agentRegistry: `eip155:${chainConfig.id}:${CONTRACT_ADDRESSES.IDENTITY_REGISTRY}`,
      agentId,
      clientAddress: `eip155:${chainConfig.id}:${this.walletClient.account!.address}`,
      createdAt: new Date().toISOString(),
      value: '5',
      valueDecimals: 0,
      tag1: 'kudos',
      tag2: params.category,
      reasoning: (params.message || '').trim(),
      ...(params.fromAgentId !== undefined && {
        fromAgentId: params.fromAgentId,
      }),
    }

    const jsonStr = JSON.stringify(feedbackFile)
    const feedbackURI = `data:application/json;base64,${Buffer.from(jsonStr).toString('base64')}`
    // Hash the raw JSON string, NOT the data URI
    const feedbackHash = keccak256(toHex(jsonStr))

    const hash = await this.walletClient.writeContract({
      address: CONTRACT_ADDRESSES.REPUTATION_REGISTRY,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: 'giveFeedback',
      args: [
        BigInt(agentId),
        BigInt(5), // Always 5-star positive endorsement
        0, // valueDecimals
        'kudos', // tag1
        params.category, // tag2
        '', // tag3 (unused)
        feedbackURI,
        feedbackHash
      ],
      account: this.walletClient.account!,
      chain: this.walletClient.chain
    })

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

    return {
      hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed
    }
  }

  /**
   * Make authenticated request to 8004scan API
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async apiCall(endpoint: string): Promise<any> {
    if (!this.apiKey) {
      throw new Error('API key required for this operation')
    }

    const response = await fetch(`https://www.8004scan.io/api/v1${endpoint}`, {
      headers: {
        'X-API-Key': this.apiKey,
        'Accept': 'application/json',
      }
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Get agent from contract
   */
  private async getAgentFromContract(agentId: number): Promise<Agent | null> {
    try {
      const [tokenURI, owner] = await Promise.all([
        this.publicClient.readContract({
          address: CONTRACT_ADDRESSES.IDENTITY_REGISTRY,
          abi: IDENTITY_REGISTRY_ABI,
          functionName: 'tokenURI',
          args: [BigInt(agentId)]
        }),
        this.publicClient.readContract({
          address: CONTRACT_ADDRESSES.IDENTITY_REGISTRY,
          abi: IDENTITY_REGISTRY_ABI,
          functionName: 'ownerOf',
          args: [BigInt(agentId)]
        })
      ])

      // Parse metadata from URI
      let name = `Agent ${agentId}`
      let description = ''

      if (tokenURI.startsWith('data:,')) {
        try {
          const metadata = JSON.parse(tokenURI.slice(6))
          name = metadata.name || name
          description = metadata.description || description
        } catch {
          // Ignore parsing errors
        }
      }

      return {
        id: agentId,
        name,
        description,
        owner: owner as Address,
        tokenURI
      }
    } catch {
      return null
    }
  }

  /**
   * Get reputation from contract
   */
  private async getReputationFromContract(agentId: number): Promise<Reputation | null> {
    try {
      const feedbackCount = await this.publicClient.readContract({
        address: CONTRACT_ADDRESSES.REPUTATION_REGISTRY,
        abi: REPUTATION_REGISTRY_ABI,
        functionName: 'getFeedbackCount',
        args: [BigInt(agentId)]
      }) as bigint

      if (feedbackCount === 0n) {
        return {
          agentId,
          qualityScore: 0,
          totalFeedbacks: 0,
          averageRating: 0,
          categories: []
        }
      }

      // This is a simplified version - in reality you'd aggregate all feedback
      const totalFeedbacks = Number(feedbackCount)
      const averageRating = 0 // Would calculate from actual feedback
      
      return {
        agentId,
        qualityScore: averageRating * 20, // Scale to 0-100
        totalFeedbacks,
        averageRating,
        categories: []
      }
    } catch {
      return null
    }
  }

  /**
   * Get feedbacks from contract
   */
  private async getFeedbacksFromContract(agentId: number): Promise<Feedback[]> {
    try {
      const feedbackCount = await this.publicClient.readContract({
        address: CONTRACT_ADDRESSES.REPUTATION_REGISTRY,
        abi: REPUTATION_REGISTRY_ABI,
        functionName: 'getFeedbackCount',
        args: [BigInt(agentId)]
      }) as bigint

      const feedbacks: Feedback[] = []
      const count = Number(feedbackCount)

      // Get last 50 feedbacks (to avoid too many RPC calls)
      const maxToFetch = Math.min(count, 50)
      const startIndex = Math.max(0, count - maxToFetch)

      for (let i = startIndex; i < count; i++) {
        try {
          const feedback = await this.publicClient.readContract({
            address: CONTRACT_ADDRESSES.REPUTATION_REGISTRY,
            abi: REPUTATION_REGISTRY_ABI,
            functionName: 'getFeedback',
            args: [BigInt(agentId), BigInt(i)]
          })

          const [from, value, , tag1, tag2, , feedbackURI, , timestamp] = feedback as [
            Address, bigint, number, string, string, string, string, Hash, bigint
          ]

          // Parse message from feedbackURI (base64 or raw JSON data URI)
          let message = ''
          try {
            if (feedbackURI.startsWith('data:application/json;base64,')) {
              const decoded = JSON.parse(Buffer.from(feedbackURI.split(',')[1] as string, 'base64').toString())
              message = decoded.reasoning || decoded.message || ''
            } else if (feedbackURI.startsWith('data:,')) {
              const decoded = JSON.parse(decodeURIComponent(feedbackURI.slice(6)))
              message = decoded.reasoning || decoded.message || ''
            }
          } catch {
            // Ignore parsing errors
          }

          feedbacks.push({
            id: `${agentId}-${i}`,
            agentId,
            from,
            category: tag2 as FeedbackCategory,
            score: Number(value),
            message,
            timestamp: Number(timestamp),
            transactionHash: '0x' as Hash // Not available from contract read
          })
        } catch {
          // Skip failed reads
        }
      }

      return feedbacks.reverse() // Most recent first
    } catch {
      return []
    }
  }

}