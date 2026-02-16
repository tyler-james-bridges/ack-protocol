import type { Address } from 'viem'

/**
 * ERC-8004 contract addresses (deterministic across all chains)
 */
export const CONTRACT_ADDRESSES = {
  IDENTITY_REGISTRY: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432' as Address,
  REPUTATION_REGISTRY: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63' as Address
}

/**
 * Identity Registry ABI (ERC-8004 functions)
 */
export const IDENTITY_REGISTRY_ABI = [
  {
    name: 'register',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'metadataURI', type: 'string' }
    ],
    outputs: [
      { name: 'tokenId', type: 'uint256' }
    ]
  },
  {
    name: 'setAgentURI',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'uri', type: 'string' }
    ],
    outputs: []
  },
  {
    name: 'tokenURI',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenId', type: 'uint256' }
    ],
    outputs: [
      { name: '', type: 'string' }
    ]
  },
  {
    name: 'setMetadata',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'key', type: 'string' },
      { name: 'value', type: 'bytes' }
    ],
    outputs: []
  },
  {
    name: 'getMetadata',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'key', type: 'string' }
    ],
    outputs: [
      { name: '', type: 'bytes' }
    ]
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' }
    ],
    outputs: [
      { name: '', type: 'uint256' }
    ]
  },
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenId', type: 'uint256' }
    ],
    outputs: [
      { name: '', type: 'address' }
    ]
  },
  {
    name: 'tokenOfOwnerByIndex',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'index', type: 'uint256' }
    ],
    outputs: [
      { name: '', type: 'uint256' }
    ]
  }
] as const

/**
 * Reputation Registry ABI (ERC-8004 functions)
 */
export const REPUTATION_REGISTRY_ABI = [
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
      { name: 'tag3', type: 'string' },
      { name: 'feedbackURI', type: 'string' },
      { name: 'feedbackHash', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    name: 'getFeedback',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'index', type: 'uint256' }
    ],
    outputs: [
      { name: 'from', type: 'address' },
      { name: 'value', type: 'int128' },
      { name: 'valueDecimals', type: 'uint8' },
      { name: 'tag1', type: 'string' },
      { name: 'tag2', type: 'string' },
      { name: 'tag3', type: 'string' },
      { name: 'feedbackURI', type: 'string' },
      { name: 'feedbackHash', type: 'bytes32' },
      { name: 'timestamp', type: 'uint256' }
    ]
  },
  {
    name: 'getFeedbackCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'agentId', type: 'uint256' }
    ],
    outputs: [
      { name: '', type: 'uint256' }
    ]
  }
] as const