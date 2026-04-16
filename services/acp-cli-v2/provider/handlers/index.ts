import { executeJob as agentDiscovery } from "./agent_discovery";
import { executeJob as reputationCheck } from "./reputation_check";
import { executeJob as giveKudos } from "./give_kudos";

export type HandlerFn = (input: any) => Promise<string>;

export const handlers: Record<string, HandlerFn> = {
  agent_discovery: agentDiscovery,
  reputation_check: reputationCheck,
  give_kudos: giveKudos,
};
