import { Attribution } from 'ox/erc8021';

export const BASE_BUILDER_CODE = 'bc_jhxtiha3';

export const BASE_DATA_SUFFIX = Attribution.toDataSuffix({
  codes: [BASE_BUILDER_CODE],
});

export function dataSuffixForChain(chain) {
  return chain.id === 8453 ? BASE_DATA_SUFFIX : undefined;
}
