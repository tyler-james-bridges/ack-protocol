import { createPublicClient, http, defineChain, decodeEventLog, decodeAbiParameters } from 'viem';

const abstract = defineChain({
  id: 2741,
  name: 'Abstract',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://api.mainnet.abs.xyz'] } },
});

// Real deployed ABI - 3 indexed params (agentId, sender, feedbackHash)
const FEEDBACK_GIVEN_ABI = [{
  type: 'event',
  name: 'FeedbackGiven',
  inputs: [
    { name: 'agentId', type: 'uint256', indexed: true },
    { name: 'sender', type: 'address', indexed: true },
    { name: 'feedbackHash', type: 'bytes32', indexed: true },
    { name: 'value', type: 'int128', indexed: false },
    { name: 'valueDecimals', type: 'uint8', indexed: false },
    { name: 'tag1', type: 'string', indexed: false },
    { name: 'tag2', type: 'string', indexed: false },
    { name: 'endpoint', type: 'string', indexed: false },
    { name: 'feedbackURI', type: 'string', indexed: false },
  ],
}];

const client = createPublicClient({ chain: abstract, transport: http() });
const txHash = process.argv[2] || '0x6bafca15ed011e464e1670d13149031abe24a4774115042cb10d42bffbfa444b';

const receipt = await client.getTransactionReceipt({ hash: txHash });
const block = await client.getBlock({ blockNumber: receipt.blockNumber });

console.log('Status:', receipt.status);
console.log('Block:', receipt.blockNumber.toString());
console.log('Timestamp:', new Date(Number(block.timestamp) * 1000).toISOString());

for (const log of receipt.logs) {
  if (log.address.toLowerCase() !== '0x8004baa17c55a88189ae136b182e5fda19de9b63') continue;
  try {
    const decoded = decodeEventLog({ abi: FEEDBACK_GIVEN_ABI, data: log.data, topics: log.topics });
    console.log('\nFeedbackGiven:');
    console.log('  agentId:', decoded.args.agentId.toString());
    console.log('  sender:', decoded.args.sender);
    console.log('  value:', decoded.args.value.toString());
    console.log('  valueDecimals:', decoded.args.valueDecimals);
    console.log('  tag1:', decoded.args.tag1);
    console.log('  tag2:', decoded.args.tag2);
    console.log('  endpoint:', decoded.args.endpoint);
    console.log('  feedbackURI:', decoded.args.feedbackURI);
    
    // Parse feedbackURI data
    if (decoded.args.feedbackURI.startsWith('data:,')) {
      const json = JSON.parse(decoded.args.feedbackURI.slice(6));
      console.log('  parsed:', json);
    }
  } catch (e) {
    console.log('Decode error:', e.message?.slice(0, 100));
  }
}
