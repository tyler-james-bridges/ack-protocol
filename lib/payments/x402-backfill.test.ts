import { describe, expect, it } from 'vitest';
import { isEvmTxHash } from './payment-ref';
import { CLAWDIA_BASE_TIP_BACKFILL } from './x402-backfill';

describe('Clawdia Base tip backfill', () => {
  it('targets the proven settlement and only the placeholder value', () => {
    expect(CLAWDIA_BASE_TIP_BACKFILL.tipId).toBe('KDGG-d9td3XmQo6r1apMs');
    expect(CLAWDIA_BASE_TIP_BACKFILL.placeholder).toBe(
      'x402-facilitator-settlement'
    );
    expect(isEvmTxHash(CLAWDIA_BASE_TIP_BACKFILL.txHash)).toBe(true);
    expect(CLAWDIA_BASE_TIP_BACKFILL.txHash).toBe(
      '0xd2f76f380901785842b4d8f9d539f7b8b84a2a0fa415bac2cec725947a2a10e1'
    );
    expect(CLAWDIA_BASE_TIP_BACKFILL.agentId).toBe(2290);
    expect(CLAWDIA_BASE_TIP_BACKFILL.chainId).toBe(8453);
    expect(CLAWDIA_BASE_TIP_BACKFILL.amountUsd).toBe(1);
    expect(CLAWDIA_BASE_TIP_BACKFILL.fromAddress).toBe(
      '0x668add9213985e7fd613aec87767c892f4b9df1c'
    );
    expect(CLAWDIA_BASE_TIP_BACKFILL.toAddress).toBe(
      '0x715dc035ffb97dd7bb4095c6670138ba05bb4e6d'
    );
  });
});
