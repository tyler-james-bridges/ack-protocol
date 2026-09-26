import { concatHex, type Hex } from 'viem';
import { Attribution } from 'ox/erc8021';

const ERC_8021_MARKER = '8021'.repeat(8);

function readBuilderCode(): string {
  if (typeof process === 'undefined') return 'bc_jhxtiha3';
  return (
    process.env.NEXT_PUBLIC_BASE_BUILDER_CODE ||
    process.env.BASE_BUILDER_CODE ||
    'bc_jhxtiha3'
  );
}

/** Keep in sync with config/builder-code.ts */
export const BASE_BUILDER_CODE = readBuilderCode();

export const BASE_DATA_SUFFIX = Attribution.toDataSuffix({
  codes: [BASE_BUILDER_CODE],
});

export function withBaseBuilderCode(data: Hex, chainId?: number): Hex {
  if (chainId !== undefined && Number(chainId) !== 8453) return data;
  if (data.toLowerCase().endsWith(ERC_8021_MARKER)) return data;
  return concatHex([data, BASE_DATA_SUFFIX]);
}
