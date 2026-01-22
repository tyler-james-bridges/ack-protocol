/**
 * Kudos Contract ABI
 * Centralized ABI definition for the Kudos smart contract.
 * This ABI is shared across all client and server-side contract interactions.
 */
export const KUDOS_CONTRACT_ABI = [
  {
    inputs: [{ name: '_xHandle', type: 'string' }],
    name: 'registerUser',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'requestAccountDeletion',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'cancelAccountDeletion',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: '_user', type: 'address' }],
    name: 'executeAccountDeletion',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: '_isPrivate', type: 'bool' }],
    name: 'setProfilePrivacy',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: '_toHandle', type: 'string' },
      { name: '_tweetUrl', type: 'string' }
    ],
    name: 'giveKudos',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: '_handle', type: 'string' }],
    name: 'isHandleAvailable',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: '_user', type: 'address' }],
    name: 'getAccountStatus',
    outputs: [
      { name: 'isRegistered', type: 'bool' },
      { name: 'isPendingDeletion', type: 'bool' },
      { name: 'deletionTime', type: 'uint256' },
      { name: 'canReregister', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: '_limit', type: 'uint256' }],
    name: 'getLeaderboard',
    outputs: [
      { name: 'handles', type: 'string[]' },
      { name: 'kudosReceived', type: 'uint256[]' },
      { name: 'addresses', type: 'address[]' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: '', type: 'address' }],
    name: 'users',
    outputs: [
      { name: 'xHandle', type: 'string' },
      { name: 'kudosReceived', type: 'uint256' },
      { name: 'kudosGiven', type: 'uint256' },
      { name: 'isRegistered', type: 'bool' },
      { name: 'registeredAt', type: 'uint256' },
      { name: 'deletionRequestedAt', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: '', type: 'string' }],
    name: 'handleToAddress',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: '', type: 'address' }],
    name: 'privateProfiles',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: '_offset', type: 'uint256' },
      { name: '_limit', type: 'uint256' }
    ],
    name: 'getKudosHistoryPage',
    outputs: [
      {
        components: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'fromHandle', type: 'string' },
          { name: 'toHandle', type: 'string' },
          { name: 'timestamp', type: 'uint256' },
          { name: 'tweetUrl', type: 'string' }
        ],
        name: '',
        type: 'tuple[]'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  }
] as const;
