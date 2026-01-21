import { createPublicClient, http } from "viem";
import { publicActionsL2 } from "viem/zksync";
import { chain } from "./chain";

/**
 * Viem specific extensions for ZK Stack chains (i.e., Abstract)
 * Learn more: https://viem.sh/zksync/
 */

// Global Viem public client instance
export const publicClient = createPublicClient({
  chain: chain,
  transport: http(),
}).extend(publicActionsL2());
