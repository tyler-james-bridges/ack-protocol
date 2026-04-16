import type {
  JobSession,
  JobRoomEntry,
  AgentMessage,
  SystemEntry,
} from "@virtuals-protocol/acp-node-v2";
import { AssetToken } from "@virtuals-protocol/acp-node-v2";
import { createAgentFromConfig } from "../src/lib/agentFactory";
import { handlers } from "./handlers";
import { routeOffering, OFFERING_PRICES } from "./routing";

const budgetSet = new Set<string>();
const submitted = new Set<string>();

function parseRequirement(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function findRequirement(session: JobSession): unknown | null {
  const msg = session.entries.find(
    (e): e is AgentMessage =>
      e.kind === "message" && e.contentType === "requirement"
  );
  if (!msg) return null;
  return parseRequirement(msg.content);
}

async function main(): Promise<void> {
  const agent = await createAgentFromConfig();

  agent.on("entry", async (session: JobSession, entry: JobRoomEntry) => {
    if (!session.roles.includes("provider")) return;

    // Set budget when requirement message arrives.
    if (entry.kind === "message" && entry.contentType === "requirement") {
      if (budgetSet.has(session.jobId)) return;
      const req = parseRequirement(entry.content);
      const offeringName = routeOffering(req);
      if (!offeringName) {
        console.error(
          `[${session.jobId}] no matching offering for requirement`,
          req
        );
        return;
      }
      const price = OFFERING_PRICES[offeringName];
      try {
        await session.setBudget(AssetToken.usdc(price, session.chainId));
        budgetSet.add(session.jobId);
        console.log(
          `[${session.jobId}] set-budget ${price} USDC (${offeringName})`
        );
      } catch (err) {
        console.error(`[${session.jobId}] set-budget failed:`, err);
      }
      return;
    }

    // Submit deliverable once funded.
    if (
      entry.kind === "system" &&
      (entry as SystemEntry).event.type === "job.funded"
    ) {
      if (submitted.has(session.jobId)) return;
      const req = findRequirement(session);
      const offeringName = routeOffering(req);
      if (!offeringName) {
        console.error(`[${session.jobId}] funded but no offering route`);
        return;
      }
      try {
        const deliverable = await handlers[offeringName](req);
        await session.submit(deliverable);
        submitted.add(session.jobId);
        console.log(`[${session.jobId}] submitted (${offeringName})`);
      } catch (err) {
        console.error(`[${session.jobId}] submit failed:`, err);
      }
    }
  });

  await agent.start();
  console.log("ACK provider listening for jobs...");

  const shutdown = async (): Promise<void> => {
    console.log("shutting down...");
    await agent.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("fatal:", err);
  process.exit(1);
});
