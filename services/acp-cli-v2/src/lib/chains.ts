import { getEvmChainByChainId } from "@virtuals-protocol/acp-node-v2";

export function formatChainId(id: number): string {
  const chain = getEvmChainByChainId(id);
  return chain ? `${id} (${chain.name})` : String(id);
}

export function formatChainIds(ids: number[]): string {
  return ids.map(formatChainId).join(", ");
}
