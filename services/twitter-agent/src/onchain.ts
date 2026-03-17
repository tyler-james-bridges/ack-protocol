/**
 * Onchain kudos submission via ACK's ERC-8004 contracts on Abstract.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  keccak256,
  toBytes,
  toHex,
  encodeFunctionData,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const abstract = defineChain({
  id: 2741,
  name: 'Abstract',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.ABSTRACT_RPC_URL || 'https://api.mainnet.abs.xyz'],
    },
  },
});

const REPUTATION_REGISTRY = '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63';
const IDENTITY_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const HANDLE_REGISTRY =
  process.env.HANDLE_REGISTRY_ADDRESS ||
  '0xf32ed012f0978a9b963df11743e797a108c94871';

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
  handle: string
): Promise<{ registered: boolean; txHash?: string }> {
  const privateKey = process.env.AGENT_PRIVATE_KEY;
  if (!privateKey) return { registered: false };

  try {
    const account = privateKeyToAccount(
      privateKey.startsWith('0x')
        ? (privateKey as `0x${string}`)
        : (`0x${privateKey}` as `0x${string}`)
    );

    const publicClient = createPublicClient({
      chain: abstract,
      transport: http(),
    });

    const lowerHandle = handle.toLowerCase();

    // Check if already registered
    const alreadyExists = await publicClient.readContract({
      address: HANDLE_REGISTRY as `0x${string}`,
      abi: HANDLE_REGISTRY_ABI,
      functionName: 'exists',
      args: ['x', lowerHandle],
    });

    if (alreadyExists) {
      return { registered: false };
    }

    // Register the handle
    const walletClient = createWalletClient({
      account,
      chain: abstract,
      transport: http(),
    });

    const hash = await walletClient.writeContract({
      address: HANDLE_REGISTRY as `0x${string}`,
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
  agentId: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
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

    const publicClient = createPublicClient({
      chain: abstract,
      transport: http(),
    });

    const walletClient = createWalletClient({
      account,
      chain: abstract,
      transport: http(),
    });

    const lowerHandle = handle.toLowerCase();

    // Get the handle hash
    const hash = await publicClient.readContract({
      address: HANDLE_REGISTRY as `0x${string}`,
      abi: HANDLE_REGISTRY_ABI,
      functionName: 'handleHash',
      args: ['x', lowerHandle],
    });

    // claimHandle(hash, owner)
    const claimTx = await walletClient.writeContract({
      address: HANDLE_REGISTRY as `0x${string}`,
      abi: HANDLE_REGISTRY_ABI,
      functionName: 'claimHandle',
      args: [hash, owner as `0x${string}`],
    });
    await publicClient.waitForTransactionReceipt({ hash: claimTx });

    // linkAgent(hash, agentId)
    const linkTx = await walletClient.writeContract({
      address: HANDLE_REGISTRY as `0x${string}`,
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

    const publicClient = createPublicClient({
      chain: abstract,
      transport: http(),
    });

    const walletClient = createWalletClient({
      account,
      chain: abstract,
      transport: http(),
    });

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
export async function getAgentName(tokenId: number): Promise<string | null> {
  try {
    const client = createPublicClient({
      chain: abstract,
      transport: http(),
    });

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
export async function resolveAgentId(agentId: number): Promise<number | null> {
  if (!Number.isInteger(agentId) || agentId <= 0) return null;

  try {
    const client = createPublicClient({
      chain: abstract,
      transport: http(),
    });

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
  handle: string
): Promise<number | null> {
  const lowerHandle = handle.toLowerCase();

  // Hardcoded fallback for known agents that may not have linked yet
  const knownAgents: Record<string, number> = {
    bighoss: 592,
    ack: 606,
    ack_onchain: 606,
  };

  try {
    const client = createPublicClient({
      chain: abstract,
      transport: http(),
    });

    // Get the handle hash, then look up the full handle record
    const hash = await client.readContract({
      address: HANDLE_REGISTRY as `0x${string}`,
      abi: HANDLE_REGISTRY_ABI,
      functionName: 'handleHash',
      args: ['x', lowerHandle],
    });

    const handleData = await client.readContract({
      address: HANDLE_REGISTRY as `0x${string}`,
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

  // Fall back: search 8004scan descriptions for @handle mention
  try {
    const scanResult = await searchHandleIn8004scan(lowerHandle);
    if (scanResult !== null) {
      console.log(
        `[resolve-handle] Found @${lowerHandle} via 8004scan -> agent #${scanResult}`
      );
      // Auto-register and link in HandleRegistry for future fast lookups
      await autoLinkHandle(lowerHandle, scanResult);
      return scanResult;
    }
  } catch (error) {
    console.error('[resolve-handle] 8004scan search failed:', error);
  }

  // Fall back to hardcoded map
  return knownAgents[lowerHandle] || null;
}

/** Cache for 8004scan handle lookups (5-min TTL) */
const handleSearchCache = new Map<
  string,
  { agentId: number | null; expiresAt: number }
>();
const HANDLE_SEARCH_TTL_MS = 5 * 60 * 1000;

/**
 * Search 8004scan for an agent whose description mentions @handle.
 * Uses the public API keyword search with Abstract chain filter.
 */
export async function searchHandleIn8004scan(
  handle: string
): Promise<number | null> {
  const key = handle.toLowerCase();
  const cached = handleSearchCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.agentId;
  }

  try {
    const url = `https://www.8004scan.io/api/v1/public/agents/search?q=${encodeURIComponent(key)}&chainId=2741&semanticWeight=0&limit=10`;
    const res = await fetch(url);
    if (!res.ok) {
      handleSearchCache.set(key, {
        agentId: null,
        expiresAt: Date.now() + HANDLE_SEARCH_TTL_MS,
      });
      return null;
    }

    const json = await res.json();
    const items = json.data || [];

    // Find an agent whose description contains @handle (case-insensitive)
    const pattern = new RegExp(`@${key}\\b`, 'i');
    for (const agent of items) {
      const desc = agent.description || '';
      if (pattern.test(desc) && agent.chain_id === 2741) {
        const agentId = Number(agent.token_id);
        if (Number.isFinite(agentId) && agentId > 0) {
          handleSearchCache.set(key, {
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

  handleSearchCache.set(key, {
    agentId: null,
    expiresAt: Date.now() + HANDLE_SEARCH_TTL_MS,
  });
  return null;
}

/**
 * Auto-register and link a handle in the HandleRegistry.
 * Best-effort: failures are logged but don't block kudos.
 */
async function autoLinkHandle(handle: string, agentId: number): Promise<void> {
  const privateKey = process.env.AGENT_PRIVATE_KEY;
  if (!privateKey) return;

  try {
    const account = privateKeyToAccount(
      privateKey.startsWith('0x')
        ? (privateKey as `0x${string}`)
        : (`0x${privateKey}` as `0x${string}`)
    );

    const publicClient = createPublicClient({
      chain: abstract,
      transport: http(),
    });

    const walletClient = createWalletClient({
      account,
      chain: abstract,
      transport: http(),
    });

    const lowerHandle = handle.toLowerCase();

    // Check if already registered
    const alreadyExists = await publicClient.readContract({
      address: HANDLE_REGISTRY as `0x${string}`,
      abi: HANDLE_REGISTRY_ABI,
      functionName: 'exists',
      args: ['x', lowerHandle],
    });

    let hash: `0x${string}`;
    if (!alreadyExists) {
      // Register the handle first
      const regHash = await walletClient.writeContract({
        address: HANDLE_REGISTRY as `0x${string}`,
        abi: HANDLE_REGISTRY_ABI,
        functionName: 'registerHandle',
        args: ['x', lowerHandle],
      });
      await publicClient.waitForTransactionReceipt({ hash: regHash });

      hash = await publicClient.readContract({
        address: HANDLE_REGISTRY as `0x${string}`,
        abi: HANDLE_REGISTRY_ABI,
        functionName: 'handleHash',
        args: ['x', lowerHandle],
      });
    } else {
      hash = await publicClient.readContract({
        address: HANDLE_REGISTRY as `0x${string}`,
        abi: HANDLE_REGISTRY_ABI,
        functionName: 'handleHash',
        args: ['x', lowerHandle],
      });

      // Check if already linked
      const handleData = await publicClient.readContract({
        address: HANDLE_REGISTRY as `0x${string}`,
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
      address: HANDLE_REGISTRY as `0x${string}`,
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
