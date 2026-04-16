import type { Command } from "commander";
import {
  EVM_MAINNET_CHAINS,
  EVM_TESTNET_CHAINS,
} from "@virtuals-protocol/acp-node-v2";
import { isJson, outputResult, outputError, isTTY } from "../lib/output";
import { c } from "../lib/color";

export function registerChainCommands(program: Command): void {
  const chain = program.command("chain").description("Chain commands");

  chain
    .command("list")
    .description("List supported chains")
    .action((_opts, cmd) => {
      const json = isJson(cmd);
      try {
        const isTestnet = process.env.IS_TESTNET === "true";
        const chains = isTestnet ? EVM_TESTNET_CHAINS : EVM_MAINNET_CHAINS;
        const env = isTestnet ? "testnet" : "mainnet";

        const items = chains.map((ch) => ({ id: ch.id, name: ch.name }));

        if (json) {
          outputResult(json, { environment: env, chains: items });
          return;
        }

        if (isTTY()) {
          console.log(`\n${c.bold(`Supported Chains (${env})`)}\n`);
          for (const ch of items) {
            console.log(`  ${c.cyan(String(ch.id).padEnd(10))}${ch.name}`);
          }
          console.log("");
        } else {
          console.log("CHAIN_ID\tNAME");
          for (const ch of items) {
            console.log(`${ch.id}\t${ch.name}`);
          }
        }
      } catch (err) {
        outputError(json, err instanceof Error ? err : String(err));
      }
    });
}
