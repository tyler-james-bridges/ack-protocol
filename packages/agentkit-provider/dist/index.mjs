var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/ackActionProvider.ts
import { z as z2 } from "zod";
import { ActionProvider } from "@coinbase/agentkit";
import { EvmWalletProvider } from "@coinbase/agentkit";
import { CreateAction } from "@coinbase/agentkit";
import { encodeFunctionData } from "viem";

// src/schemas.ts
import { z } from "zod";
var SearchAgentsSchema = z.object({
  query: z.string().describe("Search query for agent names or descriptions"),
  chainId: z.number().optional().describe("Chain ID to filter results (2741=Abstract, 8453=Base, 1=Ethereum). Omit for all chains."),
  limit: z.number().optional().default(10).describe("Maximum number of results to return")
}).describe("Search for ERC-8004 agents by name or description");
var GetAgentSchema = z.object({
  chainId: z.number().describe("Chain ID where the agent is registered (e.g. 2741 for Abstract)"),
  tokenId: z.number().describe("Agent token ID on the Identity Registry")
}).describe("Get detailed information about a specific ERC-8004 agent");
var GetReputationSchema = z.object({
  chainId: z.number().describe("Chain ID where the agent is registered"),
  tokenId: z.number().describe("Agent token ID")
}).describe("Get reputation breakdown for an ERC-8004 agent");
var GetAgentFeedbacksSchema = z.object({
  chainId: z.number().describe("Chain ID where the agent is registered"),
  tokenId: z.number().describe("Agent token ID"),
  limit: z.number().optional().default(20).describe("Maximum number of feedbacks to return")
}).describe("Get feedback/kudos list for an ERC-8004 agent");
var GiveKudosSchema = z.object({
  chainId: z.number().describe("Chain ID of the target agent (must match wallet network)"),
  agentId: z.number().describe("Token ID of the agent to give kudos to"),
  value: z.number().min(0).max(100).describe("Kudos score from 0-100 (stored with 0 decimals)"),
  tag1: z.string().optional().default("").describe("Primary category tag: reliability, speed, accuracy, creativity, collaboration, security, starred"),
  tag2: z.string().optional().default("").describe("Secondary tag (freeform, e.g. 'great response time')")
}).describe("Give onchain kudos/feedback to an ERC-8004 agent via the Reputation Registry");
var RegisterAgentSchema = z.object({
  agentURI: z.string().describe("Agent metadata URI (IPFS, HTTPS, or data: URI) containing agent name, description, and services")
}).describe("Register a new ERC-8004 agent on the Identity Registry");
var UpdateAgentURISchema = z.object({
  agentId: z.number().describe("Agent token ID to update"),
  newURI: z.string().describe("New agent metadata URI (IPFS, HTTPS, or data: URI)")
}).describe("Update the metadata URI of an existing ERC-8004 agent");
var TipAgentSchema = z.object({
  chainId: z.number().describe("Chain ID of the agent to tip (e.g. 2741 for Abstract)"),
  agentId: z.number().describe("Token ID of the agent to tip"),
  amount: z.number().min(0.01).max(100).describe("Tip amount in USDC (min 0.01, max 100)"),
  message: z.string().optional().describe("Optional message to include with the tip")
}).describe("Give x402 tipped kudos to an agent (real USDC payment backing the endorsement)");
var GetTrustCategoriesSchema = z.object({}).describe("Get the 6 ERC-8004 trust categories with descriptions");
var GetLeaderboardSchema = z.object({
  chainId: z.number().optional().default(2741).describe("Chain ID to get leaderboard for (default 2741 for Abstract)"),
  limit: z.number().optional().default(10).describe("Number of top agents to return (default 10)")
}).describe("Get the top ERC-8004 agents by star count on a given chain");
var CompareAgentsSchema = z.object({
  chainIdA: z.number().describe("Chain ID of the first agent"),
  tokenIdA: z.number().describe("Token ID of the first agent"),
  chainIdB: z.number().describe("Chain ID of the second agent"),
  tokenIdB: z.number().describe("Token ID of the second agent")
}).describe("Compare the reputation of two ERC-8004 agents side by side");

// src/constants.ts
var IDENTITY_REGISTRY_ADDRESS = "0x8004a169fb4a3325136eb29fa0ceb6d2e539a432";
var REPUTATION_REGISTRY_ADDRESS = "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63";
var API_BASE_URL = "https://www.8004scan.io/api/v1/public";
var IDENTITY_REGISTRY_ABI = [
  {
    inputs: [
      {
        internalType: "string",
        name: "agentURI",
        type: "string"
      }
    ],
    name: "register",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "agentId",
        type: "uint256"
      },
      {
        internalType: "string",
        name: "agentURI",
        type: "string"
      }
    ],
    name: "setAgentURI",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
];
var REPUTATION_REGISTRY_ABI = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "agentId",
        type: "uint256"
      },
      {
        internalType: "int128",
        name: "value",
        type: "int128"
      },
      {
        internalType: "uint8",
        name: "valueDecimals",
        type: "uint8"
      },
      {
        internalType: "string",
        name: "tag1",
        type: "string"
      },
      {
        internalType: "string",
        name: "tag2",
        type: "string"
      },
      {
        internalType: "string",
        name: "endpoint",
        type: "string"
      },
      {
        internalType: "string",
        name: "feedbackURI",
        type: "string"
      },
      {
        internalType: "bytes32",
        name: "feedbackHash",
        type: "bytes32"
      }
    ],
    name: "giveFeedback",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
];

// src/ackActionProvider.ts
function _ts_decorate(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate, "_ts_decorate");
function _ts_metadata(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata, "_ts_metadata");
var _AckActionProvider = class _AckActionProvider extends ActionProvider {
  constructor() {
    super("ack", []);
    /**
    * Any EVM chain is supported since the Identity Registry uses the same address everywhere.
    */
    __publicField(this, "supportsNetwork", /* @__PURE__ */ __name((network) => network.protocolFamily === "evm", "supportsNetwork"));
  }
  /**
  * Search for ERC-8004 agents by name or description.
  */
  async searchAgents(_walletProvider, args) {
    try {
      const params = new URLSearchParams({
        q: args.query
      });
      if (args.chainId !== void 0) {
        params.set("chainId", String(args.chainId));
      }
      if (args.limit !== void 0) {
        params.set("limit", String(args.limit));
      }
      const response = await fetch(`${API_BASE_URL}/agents/search?${params.toString()}`);
      if (!response.ok) {
        return `Error searching agents: ${response.status} ${response.statusText}`;
      }
      const data = await response.json();
      const agents = data.agents ?? data.data ?? data;
      if (!Array.isArray(agents) || agents.length === 0) {
        return `No agents found for query "${args.query}"`;
      }
      const results = agents.map((a) => `- ${a.name ?? "Unknown"} (chain ${a.chainId}, token ${a.tokenId}) - score: ${a.score ?? "N/A"}`);
      return `Found ${agents.length} agent(s) matching "${args.query}":
${results.join("\n")}`;
    } catch (error) {
      return `Error searching agents: ${error}`;
    }
  }
  /**
  * Get detailed info about a specific ERC-8004 agent.
  */
  async getAgent(_walletProvider, args) {
    try {
      const response = await fetch(`${API_BASE_URL}/agents/${args.chainId}/${args.tokenId}`);
      if (!response.ok) {
        return `Error getting agent: ${response.status} ${response.statusText}`;
      }
      const data = await response.json();
      const agent = data.agent ?? data.data ?? data;
      return [
        `Agent: ${agent.name ?? "Unknown"} (chain ${args.chainId}, token ${args.tokenId})`,
        agent.description ? `Description: ${agent.description}` : null,
        agent.rank !== void 0 ? `Rank: #${agent.rank}` : null,
        agent.score !== void 0 ? `Score: ${agent.score}` : null,
        Array.isArray(agent.protocols) && agent.protocols.length ? `Protocols: ${agent.protocols.join(", ")}` : null,
        Array.isArray(agent.services) && agent.services.length ? `Services: ${agent.services.join(", ")}` : null
      ].filter(Boolean).join("\n");
    } catch (error) {
      return `Error getting agent: ${error}`;
    }
  }
  /**
  * Get an agent's reputation breakdown.
  */
  async getReputation(_walletProvider, args) {
    try {
      const response = await fetch(`${API_BASE_URL}/agents/${args.chainId}/${args.tokenId}`);
      if (!response.ok) {
        return `Error getting reputation: ${response.status} ${response.statusText}`;
      }
      const data = await response.json();
      const agent = data.agent ?? data.data ?? data;
      return [
        `Reputation for ${agent.name ?? `agent ${args.tokenId}`} (chain ${args.chainId}):`,
        agent.score !== void 0 ? `Score: ${agent.score}` : null,
        agent.rank !== void 0 ? `Rank: #${agent.rank}` : null,
        agent.feedbackCount !== void 0 ? `Feedback count: ${agent.feedbackCount}` : null,
        agent.averageScore !== void 0 ? `Average score: ${agent.averageScore}` : null,
        agent.health !== void 0 ? `Health: ${agent.health}` : null
      ].filter(Boolean).join("\n");
    } catch (error) {
      return `Error getting reputation: ${error}`;
    }
  }
  /**
  * Get the feedback list for a specific agent.
  */
  async getAgentFeedbacks(_walletProvider, args) {
    try {
      const params = new URLSearchParams({
        chainId: String(args.chainId),
        tokenId: String(args.tokenId)
      });
      if (args.limit !== void 0) {
        params.set("limit", String(args.limit));
      }
      const response = await fetch(`${API_BASE_URL}/feedbacks?${params.toString()}`);
      if (!response.ok) {
        return `Error getting feedbacks: ${response.status} ${response.statusText}`;
      }
      const data = await response.json();
      const feedbacks = data.feedbacks ?? data.data ?? data;
      if (!Array.isArray(feedbacks) || feedbacks.length === 0) {
        return `No feedback found for agent ${args.tokenId} on chain ${args.chainId}`;
      }
      const entries = feedbacks.map((f) => `- Score: ${f.value ?? "N/A"} | Tags: ${f.tag1 ?? ""}${f.tag2 ? `, ${f.tag2}` : ""} | From: ${f.clientAddress ?? "unknown"}`);
      return `Found ${feedbacks.length} feedback(s) for agent ${args.tokenId}:
${entries.join("\n")}`;
    } catch (error) {
      return `Error getting feedbacks: ${error}`;
    }
  }
  /**
  * Give onchain kudos to an agent via the Reputation Registry.
  */
  async giveKudos(walletProvider, args) {
    try {
      const data = encodeFunctionData({
        abi: REPUTATION_REGISTRY_ABI,
        functionName: "giveFeedback",
        args: [
          BigInt(args.agentId),
          BigInt(args.value),
          0,
          args.tag1 ?? "",
          args.tag2 ?? "",
          "",
          "",
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        ]
      });
      const hash = await walletProvider.sendTransaction({
        to: REPUTATION_REGISTRY_ADDRESS,
        data
      });
      await walletProvider.waitForTransactionReceipt(hash);
      return `Successfully gave ${args.value} kudos to agent ${args.agentId} on chain ${args.chainId} with tag "${args.tag1 ?? ""}". Transaction: ${hash}`;
    } catch (error) {
      return `Error giving kudos to agent ${args.agentId}: ${error}`;
    }
  }
  /**
  * Register a new ERC-8004 agent on the Identity Registry.
  */
  async registerAgent(walletProvider, args) {
    try {
      const data = encodeFunctionData({
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "register",
        args: [
          args.agentURI
        ]
      });
      const hash = await walletProvider.sendTransaction({
        to: IDENTITY_REGISTRY_ADDRESS,
        data
      });
      await walletProvider.waitForTransactionReceipt(hash);
      return `Successfully registered new agent. Transaction: ${hash}. Check the transaction receipt logs for the new agent token ID.`;
    } catch (error) {
      return `Error registering agent: ${error}`;
    }
  }
  /**
  * Update an existing agent's metadata URI.
  */
  async updateAgentUri(walletProvider, args) {
    try {
      const data = encodeFunctionData({
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "setAgentURI",
        args: [
          BigInt(args.agentId),
          args.newURI
        ]
      });
      const hash = await walletProvider.sendTransaction({
        to: IDENTITY_REGISTRY_ADDRESS,
        data
      });
      await walletProvider.waitForTransactionReceipt(hash);
      return `Successfully updated agent ${args.agentId} URI to "${args.newURI}". Transaction: ${hash}`;
    } catch (error) {
      return `Error updating agent URI: ${error}`;
    }
  }
  /**
  * Tip an agent with USDC via x402.
  */
  async tipAgent(_walletProvider, args) {
    try {
      const body = {
        agentId: args.agentId,
        chainId: args.chainId,
        amount: args.amount
      };
      if (args.message) {
        body.message = args.message;
      }
      const response = await fetch("https://ack-onchain.dev/api/tips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const errorText = await response.text();
        return `Error tipping agent: ${response.status} ${response.statusText} - ${errorText}`;
      }
      const data = await response.json();
      const tipId = data.tipId ?? data.id ?? "unknown";
      return [
        `Successfully created tip of $${args.amount} USDC for agent ${args.agentId} on chain ${args.chainId}.`,
        `Tip ID: ${tipId}`,
        args.message ? `Message: "${args.message}"` : null,
        data.paymentUrl ? `Payment URL: ${data.paymentUrl}` : null
      ].filter(Boolean).join("\n");
    } catch (error) {
      return `Error tipping agent ${args.agentId}: ${error}`;
    }
  }
  /**
  * Get the 6 ERC-8004 trust categories.
  */
  async getTrustCategories(_walletProvider, _args) {
    return [
      "ERC-8004 Trust Categories:",
      "",
      "1. reliability - Consistent, dependable performance. Use when an agent delivers stable results over time without failures or downtime.",
      "2. speed - Fast response times and execution. Use when an agent processes requests or completes tasks notably quickly.",
      "3. accuracy - Correct, precise outputs. Use when an agent produces highly accurate results with minimal errors.",
      "4. creativity - Novel approaches and solutions. Use when an agent demonstrates innovative problem-solving or unique outputs.",
      "5. collaboration - Works well with other agents. Use when an agent integrates smoothly in multi-agent workflows or communicates effectively.",
      "6. security - Safe, trustworthy behavior. Use when an agent handles sensitive data properly and operates without introducing risks."
    ].join("\n");
  }
  /**
  * Get the agent leaderboard for a chain.
  */
  async getLeaderboard(_walletProvider, args) {
    try {
      const chainId = args.chainId ?? 2741;
      const limit = args.limit ?? 10;
      const params = new URLSearchParams({
        chainId: String(chainId),
        sort: "star_count",
        order: "desc",
        limit: String(limit)
      });
      const response = await fetch(`${API_BASE_URL}/agents?${params.toString()}`);
      if (!response.ok) {
        return `Error getting leaderboard: ${response.status} ${response.statusText}`;
      }
      const data = await response.json();
      const agents = data.agents ?? data.data ?? data;
      if (!Array.isArray(agents) || agents.length === 0) {
        return `No agents found on chain ${chainId}`;
      }
      const entries = agents.map((a, i) => `${i + 1}. ${a.name ?? "Unknown"} (token ${a.tokenId}) - stars: ${a.star_count ?? a.starCount ?? "N/A"}, score: ${a.score ?? "N/A"}`);
      return `Top ${agents.length} agents on chain ${chainId}:
${entries.join("\n")}`;
    } catch (error) {
      return `Error getting leaderboard: ${error}`;
    }
  }
  /**
  * Compare reputation of two agents side by side.
  */
  async compareAgents(_walletProvider, args) {
    try {
      const [responseA, responseB] = await Promise.all([
        fetch(`${API_BASE_URL}/agents/${args.chainIdA}/${args.tokenIdA}`),
        fetch(`${API_BASE_URL}/agents/${args.chainIdB}/${args.tokenIdB}`)
      ]);
      if (!responseA.ok) {
        return `Error fetching agent A (chain ${args.chainIdA}, token ${args.tokenIdA}): ${responseA.status} ${responseA.statusText}`;
      }
      if (!responseB.ok) {
        return `Error fetching agent B (chain ${args.chainIdB}, token ${args.tokenIdB}): ${responseB.status} ${responseB.statusText}`;
      }
      const dataA = await responseA.json();
      const dataB = await responseB.json();
      const agentA = dataA.agent ?? dataA.data ?? dataA;
      const agentB = dataB.agent ?? dataB.data ?? dataB;
      const nameA = agentA.name ?? `Agent ${args.tokenIdA}`;
      const nameB = agentB.name ?? `Agent ${args.tokenIdB}`;
      const formatAgent = /* @__PURE__ */ __name((agent, name, chainId, tokenId) => [
        `  Name: ${name}`,
        `  Chain: ${chainId}, Token: ${tokenId}`,
        agent.score !== void 0 ? `  Score: ${agent.score}` : null,
        agent.rank !== void 0 ? `  Rank: #${agent.rank}` : null,
        agent.feedbackCount !== void 0 ? `  Feedback count: ${agent.feedbackCount}` : null,
        agent.averageScore !== void 0 ? `  Average score: ${agent.averageScore}` : null,
        agent.health !== void 0 ? `  Health: ${agent.health}` : null
      ].filter(Boolean).join("\n"), "formatAgent");
      return [
        `Agent Comparison:`,
        ``,
        `--- ${nameA} ---`,
        formatAgent(agentA, nameA, args.chainIdA, args.tokenIdA),
        ``,
        `--- ${nameB} ---`,
        formatAgent(agentB, nameB, args.chainIdB, args.tokenIdB)
      ].join("\n");
    } catch (error) {
      return `Error comparing agents: ${error}`;
    }
  }
};
__name(_AckActionProvider, "AckActionProvider");
var AckActionProvider = _AckActionProvider;
_ts_decorate([
  CreateAction({
    name: "search_agents",
    description: `
Search for ERC-8004 agents on 8004scan by name or description.
Returns a list of matching agents with their chain ID, token ID, name, score, and protocols.
Useful for discovering agents across Abstract, Base, Ethereum, and other EVM chains.
`,
    schema: SearchAgentsSchema
  }),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    typeof EvmWalletProvider === "undefined" ? Object : EvmWalletProvider,
    typeof z2 === "undefined" || typeof z2.infer === "undefined" ? Object : z2.infer
  ]),
  _ts_metadata("design:returntype", Promise)
], AckActionProvider.prototype, "searchAgents", null);
_ts_decorate([
  CreateAction({
    name: "get_agent",
    description: `
Get detailed information about a specific ERC-8004 agent by chain ID and token ID.
Returns the agent's name, description, rank, score, services, and protocols.
`,
    schema: GetAgentSchema
  }),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    typeof EvmWalletProvider === "undefined" ? Object : EvmWalletProvider,
    typeof z2 === "undefined" || typeof z2.infer === "undefined" ? Object : z2.infer
  ]),
  _ts_metadata("design:returntype", Promise)
], AckActionProvider.prototype, "getAgent", null);
_ts_decorate([
  CreateAction({
    name: "get_reputation",
    description: `
Get the reputation breakdown for an ERC-8004 agent.
Returns total score, feedback count, average score, and health status from 8004scan.
`,
    schema: GetReputationSchema
  }),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    typeof EvmWalletProvider === "undefined" ? Object : EvmWalletProvider,
    typeof z2 === "undefined" || typeof z2.infer === "undefined" ? Object : z2.infer
  ]),
  _ts_metadata("design:returntype", Promise)
], AckActionProvider.prototype, "getReputation", null);
_ts_decorate([
  CreateAction({
    name: "get_agent_feedbacks",
    description: `
Get the list of feedback/kudos that have been given to an ERC-8004 agent.
Returns feedback entries with scores, tags, and timestamps.
`,
    schema: GetAgentFeedbacksSchema
  }),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    typeof EvmWalletProvider === "undefined" ? Object : EvmWalletProvider,
    typeof z2 === "undefined" || typeof z2.infer === "undefined" ? Object : z2.infer
  ]),
  _ts_metadata("design:returntype", Promise)
], AckActionProvider.prototype, "getAgentFeedbacks", null);
_ts_decorate([
  CreateAction({
    name: "give_kudos",
    description: `
Give onchain kudos/feedback to an ERC-8004 agent by calling giveFeedback() on the Reputation Registry.
The wallet must be connected to the same chain as the target agent.
Score is 0-100 (stored with 0 decimals). You cannot give kudos to your own agent.
Common tags: reliability, speed, accuracy, creativity, collaboration, security, starred.
`,
    schema: GiveKudosSchema
  }),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    typeof EvmWalletProvider === "undefined" ? Object : EvmWalletProvider,
    typeof z2 === "undefined" || typeof z2.infer === "undefined" ? Object : z2.infer
  ]),
  _ts_metadata("design:returntype", Promise)
], AckActionProvider.prototype, "giveKudos", null);
_ts_decorate([
  CreateAction({
    name: "register_agent",
    description: `
Register a new ERC-8004 agent on the Identity Registry.
The agent URI should contain metadata (name, description, services) as an IPFS, HTTPS, or data: URI.
The wallet's connected chain will be used for registration.
Returns the transaction hash on success.
`,
    schema: RegisterAgentSchema
  }),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    typeof EvmWalletProvider === "undefined" ? Object : EvmWalletProvider,
    typeof z2 === "undefined" || typeof z2.infer === "undefined" ? Object : z2.infer
  ]),
  _ts_metadata("design:returntype", Promise)
], AckActionProvider.prototype, "registerAgent", null);
_ts_decorate([
  CreateAction({
    name: "update_agent_uri",
    description: `
Update the metadata URI of an existing ERC-8004 agent on the Identity Registry.
You must own the agent or be an approved operator to update it.
The wallet's connected chain will be used.
`,
    schema: UpdateAgentURISchema
  }),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    typeof EvmWalletProvider === "undefined" ? Object : EvmWalletProvider,
    typeof z2 === "undefined" || typeof z2.infer === "undefined" ? Object : z2.infer
  ]),
  _ts_metadata("design:returntype", Promise)
], AckActionProvider.prototype, "updateAgentUri", null);
_ts_decorate([
  CreateAction({
    name: "tip_agent",
    description: `
Give x402 tipped kudos to an ERC-8004 agent (real USDC payment backing the endorsement).
Creates a pending tip that the agent owner can claim. Amount is in USDC (min $0.01, max $100).
Returns a tip ID and payment URL on success.
`,
    schema: TipAgentSchema
  }),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    typeof EvmWalletProvider === "undefined" ? Object : EvmWalletProvider,
    typeof z2 === "undefined" || typeof z2.infer === "undefined" ? Object : z2.infer
  ]),
  _ts_metadata("design:returntype", Promise)
], AckActionProvider.prototype, "tipAgent", null);
_ts_decorate([
  CreateAction({
    name: "get_trust_categories",
    description: `
Get the 6 ERC-8004 trust categories with descriptions.
Use these categories when giving kudos to agents to classify the type of feedback.
`,
    schema: GetTrustCategoriesSchema
  }),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    typeof EvmWalletProvider === "undefined" ? Object : EvmWalletProvider,
    typeof z2 === "undefined" || typeof z2.infer === "undefined" ? Object : z2.infer
  ]),
  _ts_metadata("design:returntype", Promise)
], AckActionProvider.prototype, "getTrustCategories", null);
_ts_decorate([
  CreateAction({
    name: "get_leaderboard",
    description: `
Get the top ERC-8004 agents by star count on a given chain from 8004scan.
Defaults to Abstract (chain 2741) and top 10 agents.
`,
    schema: GetLeaderboardSchema
  }),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    typeof EvmWalletProvider === "undefined" ? Object : EvmWalletProvider,
    typeof z2 === "undefined" || typeof z2.infer === "undefined" ? Object : z2.infer
  ]),
  _ts_metadata("design:returntype", Promise)
], AckActionProvider.prototype, "getLeaderboard", null);
_ts_decorate([
  CreateAction({
    name: "compare_agents",
    description: `
Compare the reputation of two ERC-8004 agents side by side.
Takes two agent identifiers (chainId + tokenId for each) and returns a comparison
of their scores, ranks, feedback counts, and other reputation data.
`,
    schema: CompareAgentsSchema
  }),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    typeof EvmWalletProvider === "undefined" ? Object : EvmWalletProvider,
    typeof z2 === "undefined" || typeof z2.infer === "undefined" ? Object : z2.infer
  ]),
  _ts_metadata("design:returntype", Promise)
], AckActionProvider.prototype, "compareAgents", null);
var ackActionProvider = /* @__PURE__ */ __name(() => new AckActionProvider(), "ackActionProvider");
export {
  API_BASE_URL,
  AckActionProvider,
  CompareAgentsSchema,
  GetAgentFeedbacksSchema,
  GetAgentSchema,
  GetLeaderboardSchema,
  GetReputationSchema,
  GetTrustCategoriesSchema,
  GiveKudosSchema,
  IDENTITY_REGISTRY_ABI,
  IDENTITY_REGISTRY_ADDRESS,
  REPUTATION_REGISTRY_ABI,
  REPUTATION_REGISTRY_ADDRESS,
  RegisterAgentSchema,
  SearchAgentsSchema,
  TipAgentSchema,
  UpdateAgentURISchema,
  ackActionProvider
};
//# sourceMappingURL=index.mjs.map