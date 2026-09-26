import { Attribution } from 'ox/erc8021';
import { concatHex, type Hex } from 'viem';

/**
 * Base Builder Code (base.dev). Public attribution id, not a secret.
 * Override with BASE_BUILDER_CODE or NEXT_PUBLIC_BASE_BUILDER_CODE.
 * Keep the fallback literal in sync with the other builder-code modules
 * (SDK, AgentKit, ACP, twitter-agent, scripts/builder-code.mjs).
 */
export const BASE_BUILDER_CODE =
  process.env.NEXT_PUBLIC_BASE_BUILDER_CODE ||
  process.env.BASE_BUILDER_CODE ||
  'bc_jhxtiha3';

export const BASE_CHAIN_ID = 8453;

/** ERC-8021 suffix marker: the final 16 bytes are `8021` repeated. */
export const ERC_8021_MARKER = '8021'.repeat(8);

export const BASE_DATA_SUFFIX = Attribution.toDataSuffix({
  codes: [BASE_BUILDER_CODE],
});

export function calldataHasErc8021Suffix(data: string): boolean {
  const hex =
    data.startsWith('0x') || data.startsWith('0X') ? data.slice(2) : data;
  return hex.toLowerCase().endsWith(ERC_8021_MARKER);
}

/** Client-level viem/wagmi `dataSuffix`. Undefined off Base so Abstract is left alone. */
export function dataSuffixForChainId(
  chainId: number | undefined
): Hex | undefined {
  return chainId === BASE_CHAIN_ID ? BASE_DATA_SUFFIX : undefined;
}

/**
 * Append the builder-code suffix to unsigned calldata when the target chain is Base.
 * No-ops if the payload already ends in the ERC-8021 marker (avoids a second suffix).
 */
export function appendBuilderCodeCalldata(
  data: Hex,
  chainId: number | undefined
): Hex {
  if (chainId !== BASE_CHAIN_ID) return data;
  if (calldataHasErc8021Suffix(data)) return data;
  return concatHex([data, BASE_DATA_SUFFIX]);
}
