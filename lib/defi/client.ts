import { createAbstractClient } from '@abstract-foundation/agw-client';
import { privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, http } from 'viem';
import { abstract } from 'viem/chains';
import { RPC_URL } from './constants';

/**
 * Create an AGW-aware Abstract client for write operations.
 * Routes all transactions through the ACK AGW smart contract.
 */
export async function getAgwClient() {
  const rawKey = process.env.AGENT_PRIVATE_KEY;
  if (!rawKey) throw new Error('AGENT_PRIVATE_KEY env var required');
  const key = rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`;
  const signer = privateKeyToAccount(key as `0x${string}`);

  const agw = await createAbstractClient({
    signer,
    chain: abstract,
    transport: http(RPC_URL),
  });

  return { agw, signer, address: agw.account.address };
}

/**
 * Create a public client for read-only operations.
 */
export function getPublicClient() {
  return createPublicClient({ chain: abstract, transport: http(RPC_URL) });
}
