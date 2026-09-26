import { Attribution } from 'ox/erc8021';

/** Keep in sync with config/builder-code.ts */
export const BASE_BUILDER_CODE =
  (typeof process !== 'undefined' &&
    (process.env.NEXT_PUBLIC_BASE_BUILDER_CODE ||
      process.env.BASE_BUILDER_CODE)) ||
  'bc_jhxtiha3';

export const BASE_DATA_SUFFIX = Attribution.toDataSuffix({
  codes: [BASE_BUILDER_CODE],
});
