import { X402_FACILITATOR_SETTLEMENT } from '@/lib/payments/payment-ref';

/**
 * One completed Base tip whose settlement tx was proven onchain and whose
 * row still stored the placeholder.
 *
 * Tx 0xd2f76f380901785842b4d8f9d539f7b8b84a2a0fa415bac2cec725947a2a10e1
 * in Base block 52235975. xpay signer 0x2772F7F74ac0aCA38C6238aA5EcE72B27bEB8C17
 * called USDC `transferWithAuthorization` (selector 0xe3ee160e) for 1_000_000
 * units. Payer 0x668aDd9213985E7Fd613Aec87767C892f4b9dF1c, payee
 * 0x715Dc035fFb97dD7bB4095C6670138BA05BB4E6d (ownerOf agent 2290). Status success.
 *
 * The update matches this id only while payment_tx_hash is still the placeholder
 * and the stored payer, payee, agent, chain, and amount agree with that tx.
 */
export const CLAWDIA_BASE_TIP_BACKFILL = {
  tipId: 'KDGG-d9td3XmQo6r1apMs',
  txHash: '0xd2f76f380901785842b4d8f9d539f7b8b84a2a0fa415bac2cec725947a2a10e1',
  placeholder: X402_FACILITATOR_SETTLEMENT,
  agentId: 2290,
  chainId: 8453,
  amountUsd: 1,
  fromAddress: '0x668add9213985e7fd613aec87767c892f4b9df1c',
  toAddress: '0x715dc035ffb97dd7bb4095c6670138ba05bb4e6d',
} as const;
