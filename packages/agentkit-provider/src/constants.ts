/**
 * Identity Registry contract address (same on all EVM chains).
 */
export const IDENTITY_REGISTRY_ADDRESS =
  '0x8004a169fb4a3325136eb29fa0ceb6d2e539a432' as const;

/**
 * Reputation Registry contract address (same on all EVM chains).
 */
export const REPUTATION_REGISTRY_ADDRESS =
  '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63' as const;

/**
 * 8004scan public API base URL.
 */
export const API_BASE_URL = 'https://www.8004scan.io/api/v1/public' as const;

/**
 * ACK Protocol website base URL (used for tip API).
 */
export const ACK_API_BASE_URL = 'https://ack-onchain.dev' as const;

/**
 * ABI for Identity Registry - register and setAgentURI functions.
 */
export const IDENTITY_REGISTRY_ABI = [
  {
    inputs: [{ internalType: 'string', name: 'agentURI', type: 'string' }],
    name: 'register',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'agentId', type: 'uint256' },
      { internalType: 'string', name: 'agentURI', type: 'string' },
    ],
    name: 'setAgentURI',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

/**
 * ABI for Reputation Registry - giveFeedback function.
 */
export const REPUTATION_REGISTRY_ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: 'agentId', type: 'uint256' },
      { internalType: 'int128', name: 'value', type: 'int128' },
      { internalType: 'uint8', name: 'valueDecimals', type: 'uint8' },
      { internalType: 'string', name: 'tag1', type: 'string' },
      { internalType: 'string', name: 'tag2', type: 'string' },
      { internalType: 'string', name: 'endpoint', type: 'string' },
      { internalType: 'string', name: 'feedbackURI', type: 'string' },
      { internalType: 'bytes32', name: 'feedbackHash', type: 'bytes32' },
    ],
    name: 'giveFeedback',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;
