/**
 * Onchain kudos submission via ACK's ERC-8004 contracts on Abstract.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  keccak256,
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

export interface KudosSubmission {
  agentId: number;
  category: string;
  message: string;
  from: string; // twitter handle of sender
  sentiment: 'positive' | 'negative';
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
        ? keccak256(toHex(feedbackURI))
        : ('0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`);

    const data = encodeFunctionData({
      abi: GIVE_FEEDBACK_ABI,
      functionName: 'giveFeedback',
      args: [
        BigInt(submission.agentId),
        submission.sentiment === 'negative' ? -5n : 5n,
        0, // valueDecimals
        submission.proxyHandle ? 'proxy' : (submission.category || 'kudos'),
        submission.proxyHandle ? `x:${submission.proxyHandle.toLowerCase()}` : '',
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
 * Resolve a Twitter handle to an agent token ID.
 * Checks the 8004scan API for agents with matching Twitter/X service.
 */
export async function resolveHandleToAgentId(
  _handle: string
): Promise<number | null> {
  // TODO: Build a mapping of twitter handles -> agent IDs
  // For now, use a hardcoded map of known agents
  const knownAgents: Record<string, number> = {
    bighoss: 592,
    ack: 606,
    ack_onchain: 606,
  };

  return knownAgents[_handle.toLowerCase()] || null;
}
