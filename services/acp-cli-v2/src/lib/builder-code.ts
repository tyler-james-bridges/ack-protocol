import { Attribution } from 'ox/erc8021';
import { concatHex, type Call } from 'viem';
import type { IEvmProviderAdapter } from '@virtuals-protocol/acp-node-v2';

const ERC_8021_MARKER = '8021'.repeat(8);

/** Keep in sync with config/builder-code.ts */
export const BASE_BUILDER_CODE =
  process.env.BASE_BUILDER_CODE ||
  process.env.NEXT_PUBLIC_BASE_BUILDER_CODE ||
  'bc_jhxtiha3';

const BASE_DATA_SUFFIX = Attribution.toDataSuffix({
  codes: [BASE_BUILDER_CODE],
});

function withSuffix(data: Call['data']): Call['data'] {
  const calldata = data ?? '0x';
  if (calldata.toLowerCase().endsWith(ERC_8021_MARKER)) return calldata;
  return concatHex([calldata, BASE_DATA_SUFFIX]);
}

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
            data: withSuffix(call.data),
          }))
        : calls
    );

  return provider;
}
