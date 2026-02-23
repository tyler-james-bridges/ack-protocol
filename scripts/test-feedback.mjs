import { createPublicClient, http, defineChain, keccak256, toHex } from 'viem';

const abstract = defineChain({
  id: 2741,
  name: 'Abstract',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://api.mainnet.abs.xyz'] } },
});

const client = createPublicClient({ chain: abstract, transport: http() });

const abi = [
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
];

const feedbackURI =
  'data:,{"from":"twitter:@test","category":"kudos","source":"twitter"}';
const feedbackHash = keccak256(toHex(feedbackURI));

try {
  await client.simulateContract({
    address: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
    abi,
    functionName: 'giveFeedback',
    args: [606n, 5n, 0, 'kudos', '', '', feedbackURI, feedbackHash],
    account: '0x77696ebf0bEC353048d1E9d7baE9DeDd0d503831',
  });
  console.log('ACK #606 simulation SUCCESS!');
} catch (e) {
  console.log('ACK failed:', e.shortMessage || e.message);
}

try {
  await client.simulateContract({
    address: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
    abi,
    functionName: 'giveFeedback',
    args: [592n, 5n, 0, 'kudos', '', '', feedbackURI, feedbackHash],
    account: '0x77696ebf0bEC353048d1E9d7baE9DeDd0d503831',
  });
  console.log('BigHoss #592 simulation SUCCESS!');
} catch (e) {
  console.log('BigHoss failed:', e.shortMessage || e.message);
}
