import { concatHex, type Hex } from 'viem';
import { Attribution } from 'ox/erc8021';

export const BASE_BUILDER_CODE = 'bc_jhxtiha3' as const;

export const BASE_DATA_SUFFIX = Attribution.toDataSuffix({
  codes: [BASE_BUILDER_CODE],
});

export function withBaseBuilderCode(data: Hex): Hex {
  return concatHex([data, BASE_DATA_SUFFIX]);
}
