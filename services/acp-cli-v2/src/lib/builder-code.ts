import { Attribution } from 'ox/erc8021';
import { concatHex, type Call } from 'viem';
import type { IEvmProviderAdapter } from '@virtuals-protocol/acp-node-v2';

export const BASE_BUILDER_CODE = 'bc_jhxtiha3' as const;

const BASE_DATA_SUFFIX = Attribution.toDataSuffix({
  codes: [BASE_BUILDER_CODE],
});

export function withBaseBuilderAttribution(
  provider: IEvmProviderAdapter
): IEvmProviderAdapter {
  const sendCalls = provider.sendCalls.bind(provider);

  provider.sendCalls = (chainId: number, calls: Call[]) =>
    sendCalls(
      chainId,
      chainId === 8453
        ? calls.map((call) => ({
            ...call,
            data: concatHex([call.data ?? '0x', BASE_DATA_SUFFIX]),
          }))
        : calls
    );

  return provider;
}
