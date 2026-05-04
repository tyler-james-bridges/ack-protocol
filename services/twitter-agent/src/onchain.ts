/**
 * Onchain kudos submission via ACK's ERC-8004 contracts.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  type Chain,
  keccak256,
  toBytes,
  encodeFunctionData,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

interface TwitterChainConfig {
  id: number;
  slug: string;
  name: string;
  chain: Chain;
  rpcUrl: string;
  explorerUrl: string;
  handleRegistryAddress?: `0x${string}`;
  proxyAgentId?: number;
}

const DEFAULT_ABSTRACT_HANDLE_REGISTRY =
  '0xf32ed012f0978a9b963df11743e797a108c94871' as const;

const CHAIN_CONFIGS: Record<number, TwitterChainConfig> = {
  2741: {
    id: 2741,
    slug: 'abstract',
    name: 'Abstract',
    rpcUrl: process.env.ABSTRACT_RPC_URL || 'https://api.mainnet.abs.xyz',
    explorerUrl: 'https://abscan.org',
    handleRegistryAddress: (process.env.ABSTRACT_HANDLE_REGISTRY_ADDRESS ||
      process.env.HANDLE_REGISTRY_ADDRESS ||
      DEFAULT_ABSTRACT_HANDLE_REGISTRY) as `0x${string}`,
    proxyAgentId: Number(process.env.ABSTRACT_PROXY_AGENT_ID || 606),
    chain: defineChain({
      id: 2741,
      name: 'Abstract',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: {
        default: {
          http: [process.env.ABSTRACT_RPC_URL || 'https://api.mainnet.abs.xyz'],
        },
      },
    }),
  },
  8453: {
    id: 8453,
    slug: 'base',
    name: 'Base',
    rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    handleRegistryAddress: (process.env.BASE_HANDLE_REGISTRY_ADDRESS ||
      process.env.HANDLE_REGISTRY_ADDRESS ||
      undefined) as `0x${string}` | undefined,
    proxyAgentId: process.env.BASE_PROXY_AGENT_ID
      ? Number(process.env.BASE_PROXY_AGENT_ID)
      : undefined,
    chain: defineChain({
      id: 8453,
      name: 'Base',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: {
        default: {
          http: [process.env.BASE_RPC_URL || 'https://mainnet.base.org'],
        },
      },
      blockExplorers: {
        default: { name: 'Basescan', url: 'https://basescan.org' },
      },
    }),
  },
};

const SUPPORTED_TWITTER_CHAIN_IDS = Object.keys(CHAIN_CONFIGS).map(Number);

const CHAIN_ALIASES: Record<string, number> = {
  abstract: 2741,
  abs: 2741,
  base: 8453,
};

export function resolveTwitterChainId(
  input: string | number | undefined
): number | undefined {
  if (input === undefined || input === null || input === '') return undefined;
  if (typeof input === 'number') {
    return CHAIN_CONFIGS[input] ? input : undefined;
  }
  const normalized = input.toLowerCase();
  const id = CHAIN_ALIASES[normalized] ?? Number(normalized);
  return CHAIN_CONFIGS[id] ? id : undefined;
}

export function getDefaultChainId(): number {
  return (
    resolveTwitterChainId(process.env.ACK_CHAIN_ID) ??
    resolveTwitterChainId(process.env.ACK_CHAIN) ??
    2741
  );
}

export function getTwitterChainConfig(chainId?: number): TwitterChainConfig {
  return CHAIN_CONFIGS[chainId ?? getDefaultChainId()] ?? CHAIN_CONFIGS[2741];
}

export function getExplorerTxUrl(txHash: string, chainId?: number): string {
  return `${getTwitterChainConfig(chainId).explorerUrl}/tx/${txHash}`;
}

export function getActiveChainLabel(): string {
  const cfg = getTwitterChainConfig();
  return `${cfg.name} (${cfg.id})`;
}

function getHandleRegistryAddress(chainId?: number): `0x${string}` | undefined {
  return getTwitterChainConfig(chainId).handleRegistryAddress;
}

export function getProxyAgentId(chainId?: number): number | undefined {
  return getTwitterChainConfig(chainId).proxyAgentId;
}

function createPublicClientForChain(chainId?: number) {
  const cfg = getTwitterChainConfig(chainId);
  return createPublicClient({
    chain: cfg.chain,
    transport: http(cfg.rpcUrl),
  });
}

export interface ResolvedAgentTarget {
  agentId: number;
  chainId: number;
  chainName: string;
}

const resolutionCache = new Map<
  string,
  { value: ResolvedAgentTarget | null; expiresAt: number }
>();
const RESOLUTION_TTL_MS = 5 * 60 * 1000;

function getCachedResolution(
  key: string
): ResolvedAgentTarget | null | undefined {
  const cached = resolutionCache.get(key);
  if (!cached) return undefined;
  if (cached.expiresAt <= Date.now()) {
    resolutionCache.delete(key);
    return undefined;
  }
  return cached.value;
}

function setCachedResolution(
  key: string,
  value: ResolvedAgentTarget | null
): void {
  resolutionCache.set(key, {
    value,
    expiresAt: Date.now() + RESOLUTION_TTL_MS,
  });
}

async function agentExistsOnChain(
  agentId: number,
  chainId: number
): Promise<boolean> {
  try {
    const client = createPublicClientForChain(chainId);
    await client.readContract({
      address: IDENTITY_REGISTRY,
      abi: OWNER_OF_ABI,
      functionName: 'ownerOf',
      args: [BigInt(agentId)],
    });
    return true;
  } catch {
    return false;
  }
}

function chooseResolvedTarget(
  matches: ResolvedAgentTarget[],
  defaultChainId: number
): ResolvedAgentTarget | null {
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];

  // Preserve the slick Abstract behavior for ambiguous bare #ids.
  return matches.find((m) => m.chainId === defaultChainId) ?? null;
}

/**
 * Resolve a bare agent ID to a chain. If a chain hint exists, validate only
 * that chain. Without a hint, check supported chains concurrently and pick the
 * unique match; if ambiguous, preserve the configured default chain.
 */
export async function resolveAgentTarget(
  agentId: number,
  chainHint?: number
): Promise<ResolvedAgentTarget | null> {
  if (!Number.isInteger(agentId) || agentId <= 0) return null;

  const defaultChainId = getDefaultChainId();
  const cacheKey = `agent:${chainHint ?? 'auto'}:${defaultChainId}:${agentId}`;
  const cached = getCachedResolution(cacheKey);
  if (cached !== undefined) return cached;

  const candidateChainIds =
    chainHint !== undefined ? [chainHint] : SUPPORTED_TWITTER_CHAIN_IDS;

  const results = await Promise.all(
    candidateChainIds.map(async (chainId) => {
      const exists = await agentExistsOnChain(agentId, chainId);
      if (!exists) return null;
      const cfg = getTwitterChainConfig(chainId);
      return {
        agentId,
        chainId,
        chainName: cfg.name,
      } satisfies ResolvedAgentTarget;
    })
  );

  const resolved = chooseResolvedTarget(
    results.filter((r): r is ResolvedAgentTarget => r !== null),
    defaultChainId
  );
  setCachedResolution(cacheKey, resolved);
  return resolved;
}

/**
 * Resolve an X handle to a chain-aware agent target. With no chain hint, probe
 * supported chains and pick the unique match; ambiguous handles preserve the
 * configured default chain.
 */
export async function resolveHandleTarget(
  handle: string,
  chainHint?: number
): Promise<ResolvedAgentTarget | null> {
  const lowerHandle = handle.toLowerCase();
  if (!lowerHandle || lowerHandle.length > 15) return null;

  const defaultChainId = getDefaultChainId();
  const cacheKey = `handle:${chainHint ?? 'auto'}:${defaultChainId}:${lowerHandle}`;
  const cached = getCachedResolution(cacheKey);
  if (cached !== undefined) return cached;

  const candidateChainIds =
    chainHint !== undefined ? [chainHint] : SUPPORTED_TWITTER_CHAIN_IDS;

  const results = await Promise.all(
    candidateChainIds.map(async (chainId) => {
      const agentId = await resolveHandleToAgentId(lowerHandle, chainId);
      if (!agentId) return null;
      const cfg = getTwitterChainConfig(chainId);
      return {
        agentId,
        chainId,
        chainName: cfg.name,
      } satisfies ResolvedAgentTarget;
    })
  );

  const resolved = chooseResolvedTarget(
    results.filter((r): r is ResolvedAgentTarget => r !== null),
    defaultChainId
  );
  setCachedResolution(cacheKey, resolved);
  return resolved;
}

function createWalletClients(
  account: ReturnType<typeof privateKeyToAccount>,
  chainId?: number
) {
  const cfg = getTwitterChainConfig(chainId);
  const transport = http(cfg.rpcUrl);
  return {
    cfg,
    publicClient: createPublicClient({
      chain: cfg.chain,
      transport,
    }),
    walletClient: createWalletClient({
      account,
      chain: cfg.chain,
      transport,
    }),
  };
}

const REPUTATION_REGISTRY = '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63';
const IDENTITY_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';

// giveFeedback ABI (value is int128)
const GIVE_FEEDBACK_ABI = [
  {
    name: 'giveFeedback',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'value', type: 'int128' },
      { name: 'valueDecimals', type: 'uint8' },
      { name: 'tag1', type: 'string' },
      { name: 'tag2', type: 'string' },
      { name: 'endpoint', type: 'string' },
      { name: 'feedbackURI', type: 'string' },
      { name: 'feedbackHash', type: 'bytes32' },
    ],
    outputs: [],
  },
] as const;

// tokenURI to look up agent names
const TOKEN_URI_ABI = [
  {
    name: 'tokenURI',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

const OWNER_OF_ABI = [
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

// HandleRegistry ABI
const HANDLE_REGISTRY_ABI = [
  {
    name: 'exists',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'platform', type: 'string' },
      { name: 'handle', type: 'string' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'registerHandle',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'platform', type: 'string' },
      { name: 'handle', type: 'string' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'handleHash',
    type: 'function',
    stateMutability: 'pure',
    inputs: [
      { name: 'platform', type: 'string' },
      { name: 'handle', type: 'string' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'getHandle',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'hash', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'platform', type: 'string' },
          { name: 'handle', type: 'string' },
          { name: 'claimedBy', type: 'address' },
          { name: 'linkedAgentId', type: 'uint256' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'claimedAt', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'claimHandle',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'hash', type: 'bytes32' },
      { name: 'owner', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'linkAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'hash', type: 'bytes32' },
      { name: 'agentId', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

/**
 * Ensure an X handle is registered in the HandleRegistry.
 * Returns true if it was newly registered, false if it already existed.
 */
export async function ensureHandleRegistered(
  handle: string,
  chainId?: number
): Promise<{ registered: boolean; txHash?: string }> {
  const privateKey = process.env.AGENT_PRIVATE_KEY;
  if (!privateKey) return { registered: false };

  const handleRegistry = getHandleRegistryAddress(chainId);
  if (!handleRegistry) return { registered: false };

  try {
    const account = privateKeyToAccount(
      privateKey.startsWith('0x')
        ? (privateKey as `0x${string}`)
        : (`0x${privateKey}` as `0x${string}`)
    );

    const { publicClient, walletClient } = createWalletClients(
      account,
      chainId
    );

    const lowerHandle = handle.toLowerCase();

    // Check if already registered
    const alreadyExists = await publicClient.readContract({
      address: handleRegistry,
      abi: HANDLE_REGISTRY_ABI,
      functionName: 'exists',
      args: ['x', lowerHandle],
    });

    if (alreadyExists) {
      return { registered: false };
    }

    const hash = await walletClient.writeContract({
      address: handleRegistry,
      abi: HANDLE_REGISTRY_ABI,
      functionName: 'registerHandle',
      args: ['x', lowerHandle],
    });

    await publicClient.waitForTransactionReceipt({ hash });
    return { registered: true, txHash: hash };
  } catch (error) {
    console.error('[handle-registry] Error:', error);
    return { registered: false };
  }
}

/**
 * Submit a handle claim onchain: claimHandle + linkAgent.
 * Called by the twitter-agent after verifying a claim tweet.
 */
export async function submitClaim(
  handle: string,
  owner: string,
  agentId: number,
  chainId?: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  const privateKey = process.env.AGENT_PRIVATE_KEY;
  if (!privateKey) {
    return { success: false, error: 'AGENT_PRIVATE_KEY not set' };
  }

  const handleRegistry = getHandleRegistryAddress(chainId);
  if (!handleRegistry) {
    return { success: false, error: 'HandleRegistry not configured' };
  }

  try {
    const account = privateKeyToAccount(
      privateKey.startsWith('0x')
        ? (privateKey as `0x${string}`)
        : (`0x${privateKey}` as `0x${string}`)
    );

    const { publicClient, walletClient } = createWalletClients(
      account,
      chainId
    );

    const lowerHandle = handle.toLowerCase();

    // Get the handle hash
    const hash = await publicClient.readContract({
      address: handleRegistry,
      abi: HANDLE_REGISTRY_ABI,
      functionName: 'handleHash',
      args: ['x', lowerHandle],
    });

    // claimHandle(hash, owner)
    const claimTx = await walletClient.writeContract({
      address: handleRegistry,
      abi: HANDLE_REGISTRY_ABI,
      functionName: 'claimHandle',
      args: [hash, owner as `0x${string}`],
    });
    await publicClient.waitForTransactionReceipt({ hash: claimTx });

    // linkAgent(hash, agentId)
    const linkTx = await walletClient.writeContract({
      address: handleRegistry,
      abi: HANDLE_REGISTRY_ABI,
      functionName: 'linkAgent',
      args: [hash, BigInt(agentId)],
    });
    await publicClient.waitForTransactionReceipt({ hash: linkTx });

    return { success: true, txHash: linkTx };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

export interface KudosSubmission {
  agentId: number;
  category: string;
  message: string;
  from: string; // twitter handle of sender
  sentiment: 'positive' | 'negative';
  amount: number; // kudos amount (default 1, max 100)
  proxyHandle?: string; // if set, this is a proxy kudos for an X handle (not a direct agent)
  chainId?: number;
}

export interface KudosResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * Submit kudos onchain via giveFeedback.
 */
export async function submitKudos(
  submission: KudosSubmission
): Promise<KudosResult> {
  const privateKey = process.env.AGENT_PRIVATE_KEY;
  if (!privateKey) {
    return { success: false, error: 'AGENT_PRIVATE_KEY not set' };
  }

  try {
    const account = privateKeyToAccount(
      privateKey.startsWith('0x')
        ? (privateKey as `0x${string}`)
        : (`0x${privateKey}` as `0x${string}`)
    );

    const { publicClient, walletClient } = createWalletClients(
      account,
      submission.chainId
    );

    // Build feedbackURI
    const feedbackData: Record<string, unknown> = {
      from: `twitter:@${submission.from}`,
      category: submission.category,
      message: submission.message,
      source: 'twitter',
      timestamp: Date.now(),
    };

    if (submission.proxyHandle) {
      feedbackData.proxyFor = `x:@${submission.proxyHandle}`;
    }

    const feedbackURI =
      submission.category || submission.message
        ? `data:,${JSON.stringify(feedbackData)}`
        : '';

    const feedbackHash =
      feedbackURI.length > 0
        ? keccak256(toBytes(feedbackURI))
        : ('0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`);

    const data = encodeFunctionData({
      abi: GIVE_FEEDBACK_ABI,
      functionName: 'giveFeedback',
      args: [
        BigInt(submission.agentId),
        BigInt(
          submission.sentiment === 'negative'
            ? -submission.amount
            : submission.amount
        ),
        0, // valueDecimals
        submission.proxyHandle ? 'proxy' : submission.category || 'kudos',
        submission.proxyHandle
          ? `x:${submission.proxyHandle.toLowerCase()}`
          : '',
        '',
        feedbackURI,
        feedbackHash,
      ],
    });

    const hash = await walletClient.sendTransaction({
      to: REPUTATION_REGISTRY,
      data,
    });

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return {
      success: receipt.status === 'success',
      txHash: hash,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

/**
 * Look up agent name from token ID via onchain tokenURI.
 */
export async function getAgentName(
  tokenId: number,
  chainId?: number
): Promise<string | null> {
  try {
    const client = createPublicClientForChain(chainId);

    const uri = await client.readContract({
      address: IDENTITY_REGISTRY,
      abi: TOKEN_URI_ABI,
      functionName: 'tokenURI',
      args: [BigInt(tokenId)],
    });

    if (uri.startsWith('data:')) {
      const b64 = uri.split(',')[1];
      const decoded = JSON.parse(atob(b64));
      return decoded.name || null;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve and validate explicit agent id targeting against 8004.
 */
export async function resolveAgentId(
  agentId: number,
  chainId?: number
): Promise<number | null> {
  if (!Number.isInteger(agentId) || agentId <= 0) return null;

  try {
    const client = createPublicClientForChain(chainId);

    await client.readContract({
      address: IDENTITY_REGISTRY,
      abi: OWNER_OF_ABI,
      functionName: 'ownerOf',
      args: [BigInt(agentId)],
    });

    return agentId;
  } catch {
    return null;
  }
}

/**
 * Resolve a Twitter handle to an agent token ID.
 * Queries the HandleRegistry for a linked agent, falls back to hardcoded map.
 */
export async function resolveHandleToAgentId(
  handle: string,
  chainId?: number
): Promise<number | null> {
  const lowerHandle = handle.toLowerCase();
  const targetChainId = chainId ?? getDefaultChainId();
  const handleRegistry = getHandleRegistryAddress(targetChainId);

  // Hardcoded fallback for known agents that may not have linked yet
  const knownAgents: Record<number, Record<string, number>> = {
    2741: {
      bighoss: 592,
      ack: 606,
      ack_onchain: 606,
    },
  };

  if (handleRegistry) {
    try {
      const client = createPublicClientForChain(targetChainId);

      // Get the handle hash, then look up the full handle record
      const hash = await client.readContract({
        address: handleRegistry,
        abi: HANDLE_REGISTRY_ABI,
        functionName: 'handleHash',
        args: ['x', lowerHandle],
      });

      const handleData = await client.readContract({
        address: handleRegistry,
        abi: HANDLE_REGISTRY_ABI,
        functionName: 'getHandle',
        args: [hash],
      });

      const linkedAgentId = Number(handleData.linkedAgentId);
      if (linkedAgentId > 0) {
        return linkedAgentId;
      }
    } catch (error) {
      console.error('[resolve-handle] Registry lookup failed:', error);
    }
  }

  // Fall back: search 8004scan descriptions for @handle mention
  try {
    const scanResult = await searchHandleIn8004scan(lowerHandle, targetChainId);
    if (scanResult !== null) {
      console.log(
        `[resolve-handle] Found @${lowerHandle} via 8004scan on ${targetChainId} -> agent #${scanResult}`
      );
      // Auto-register and link in HandleRegistry for future fast lookups
      await autoLinkHandle(lowerHandle, scanResult, targetChainId);
      return scanResult;
    }
  } catch (error) {
    console.error('[resolve-handle] 8004scan search failed:', error);
  }

  // Fall back to hardcoded map
  return knownAgents[targetChainId]?.[lowerHandle] || null;
}

/** Cache for 8004scan handle lookups (5-min TTL) */
const handleSearchCache = new Map<
  string,
  { agentId: number | null; expiresAt: number }
>();
const HANDLE_SEARCH_TTL_MS = 5 * 60 * 1000;

/**
 * Search 8004scan for an agent whose description mentions @handle.
 * Uses the public API keyword search with a chain filter.
 */
export async function searchHandleIn8004scan(
  handle: string,
  chainId?: number
): Promise<number | null> {
  const targetChainId = chainId ?? getDefaultChainId();
  const key = handle.toLowerCase();
  const cacheKey = `${targetChainId}:${key}`;
  const cached = handleSearchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.agentId;
  }

  try {
    const url = `https://www.8004scan.io/api/v1/public/agents/search?q=${encodeURIComponent(key)}&chainId=${targetChainId}&semanticWeight=0&limit=10`;
    const res = await fetch(url);
    if (!res.ok) {
      handleSearchCache.set(cacheKey, {
        agentId: null,
        expiresAt: Date.now() + HANDLE_SEARCH_TTL_MS,
      });
      return null;
    }

    const json = await res.json();
    const items = json.data || [];

    // Find an agent whose metadata clearly references this X handle.
    const mentionPattern = new RegExp(`(^|[^a-z0-9_])@${key}\\b`, 'i');
    const urlPattern = new RegExp(
      `(?:x\\.com|twitter\\.com)/${key}(?:\\b|/|\\?)`,
      'i'
    );
    for (const agent of items) {
      const searchable = [
        agent.description,
        agent.name,
        JSON.stringify(agent.services || {}),
        JSON.stringify(agent.raw_metadata || agent.metadata || {}),
      ]
        .filter(Boolean)
        .join(' ');

      if (
        Number(agent.chain_id) === targetChainId &&
        (mentionPattern.test(searchable) || urlPattern.test(searchable))
      ) {
        const agentId = Number(agent.token_id);
        if (Number.isFinite(agentId) && agentId > 0) {
          handleSearchCache.set(cacheKey, {
            agentId,
            expiresAt: Date.now() + HANDLE_SEARCH_TTL_MS,
          });
          return agentId;
        }
      }
    }
  } catch (error) {
    console.error('[8004scan-search] Error:', error);
  }

  handleSearchCache.set(cacheKey, {
    agentId: null,
    expiresAt: Date.now() + HANDLE_SEARCH_TTL_MS,
  });
  return null;
}

/**
 * Auto-register and link a handle in the HandleRegistry.
 * Best-effort: failures are logged but don't block kudos.
 */
async function autoLinkHandle(
  handle: string,
  agentId: number,
  chainId?: number
): Promise<void> {
  const privateKey = process.env.AGENT_PRIVATE_KEY;
  if (!privateKey) return;
  const handleRegistry = getHandleRegistryAddress(chainId);
  if (!handleRegistry) return;

  try {
    const account = privateKeyToAccount(
      privateKey.startsWith('0x')
        ? (privateKey as `0x${string}`)
        : (`0x${privateKey}` as `0x${string}`)
    );

    const { publicClient, walletClient } = createWalletClients(
      account,
      chainId
    );

    const lowerHandle = handle.toLowerCase();

    // Check if already registered
    const alreadyExists = await publicClient.readContract({
      address: handleRegistry,
      abi: HANDLE_REGISTRY_ABI,
      functionName: 'exists',
      args: ['x', lowerHandle],
    });

    let hash: `0x${string}`;
    if (!alreadyExists) {
      // Register the handle first
      const regHash = await walletClient.writeContract({
        address: handleRegistry,
        abi: HANDLE_REGISTRY_ABI,
        functionName: 'registerHandle',
        args: ['x', lowerHandle],
      });
      await publicClient.waitForTransactionReceipt({ hash: regHash });

      hash = await publicClient.readContract({
        address: handleRegistry,
        abi: HANDLE_REGISTRY_ABI,
        functionName: 'handleHash',
        args: ['x', lowerHandle],
      });
    } else {
      hash = await publicClient.readContract({
        address: handleRegistry,
        abi: HANDLE_REGISTRY_ABI,
        functionName: 'handleHash',
        args: ['x', lowerHandle],
      });

      // Check if already linked
      const handleData = await publicClient.readContract({
        address: handleRegistry,
        abi: HANDLE_REGISTRY_ABI,
        functionName: 'getHandle',
        args: [hash],
      });
      if (Number(handleData.linkedAgentId) > 0) {
        return; // Already linked, nothing to do
      }
    }

    // Link the agent
    const linkTx = await walletClient.writeContract({
      address: handleRegistry,
      abi: HANDLE_REGISTRY_ABI,
      functionName: 'linkAgent',
      args: [hash, BigInt(agentId)],
    });
    await publicClient.waitForTransactionReceipt({ hash: linkTx });
    console.log(
      `[auto-link] Linked @${lowerHandle} -> agent #${agentId} (tx: ${linkTx})`
    );
  } catch (error) {
    console.error(`[auto-link] Failed to link @${handle}:`, error);
  }
}
