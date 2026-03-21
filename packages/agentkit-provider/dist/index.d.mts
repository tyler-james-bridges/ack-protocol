import { z } from 'zod';
import { ActionProvider, EvmWalletProvider, Network } from '@coinbase/agentkit';

/**
 * Input schema for searching ERC-8004 agents via 8004scan.
 */
declare const SearchAgentsSchema: z.ZodObject<{
    query: z.ZodString;
    chainId: z.ZodOptional<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    query: string;
    limit: number;
    chainId?: number | undefined;
}, {
    query: string;
    chainId?: number | undefined;
    limit?: number | undefined;
}>;
/**
 * Input schema for getting detailed agent info.
 */
declare const GetAgentSchema: z.ZodObject<{
    chainId: z.ZodNumber;
    tokenId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    chainId: number;
    tokenId: number;
}, {
    chainId: number;
    tokenId: number;
}>;
/**
 * Input schema for getting agent reputation breakdown.
 */
declare const GetReputationSchema: z.ZodObject<{
    chainId: z.ZodNumber;
    tokenId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    chainId: number;
    tokenId: number;
}, {
    chainId: number;
    tokenId: number;
}>;
/**
 * Input schema for getting feedback list for an agent.
 */
declare const GetAgentFeedbacksSchema: z.ZodObject<{
    chainId: z.ZodNumber;
    tokenId: z.ZodNumber;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    chainId: number;
    limit: number;
    tokenId: number;
}, {
    chainId: number;
    tokenId: number;
    limit?: number | undefined;
}>;
/**
 * Input schema for giving onchain kudos to an agent.
 */
declare const GiveKudosSchema: z.ZodObject<{
    chainId: z.ZodNumber;
    agentId: z.ZodNumber;
    value: z.ZodNumber;
    tag1: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    tag2: z.ZodDefault<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    chainId: number;
    value: number;
    agentId: number;
    tag1: string;
    tag2: string;
}, {
    chainId: number;
    value: number;
    agentId: number;
    tag1?: string | undefined;
    tag2?: string | undefined;
}>;
/**
 * Input schema for registering a new ERC-8004 agent.
 */
declare const RegisterAgentSchema: z.ZodObject<{
    agentURI: z.ZodString;
}, "strip", z.ZodTypeAny, {
    agentURI: string;
}, {
    agentURI: string;
}>;
/**
 * Input schema for updating an agent's metadata URI.
 */
declare const UpdateAgentURISchema: z.ZodObject<{
    agentId: z.ZodNumber;
    newURI: z.ZodString;
}, "strip", z.ZodTypeAny, {
    agentId: number;
    newURI: string;
}, {
    agentId: number;
    newURI: string;
}>;
/**
 * Input schema for tipping an agent with USDC via x402.
 */
declare const TipAgentSchema: z.ZodObject<{
    chainId: z.ZodNumber;
    agentId: z.ZodNumber;
    amount: z.ZodNumber;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    chainId: number;
    agentId: number;
    amount: number;
    message?: string | undefined;
}, {
    chainId: number;
    agentId: number;
    amount: number;
    message?: string | undefined;
}>;
/**
 * Input schema for getting trust categories.
 */
declare const GetTrustCategoriesSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
/**
 * Input schema for getting the agent leaderboard.
 */
declare const GetLeaderboardSchema: z.ZodObject<{
    chainId: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    chainId: number;
    limit: number;
}, {
    chainId?: number | undefined;
    limit?: number | undefined;
}>;
/**
 * Input schema for comparing two agents.
 */
declare const CompareAgentsSchema: z.ZodObject<{
    chainIdA: z.ZodNumber;
    tokenIdA: z.ZodNumber;
    chainIdB: z.ZodNumber;
    tokenIdB: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    chainIdA: number;
    tokenIdA: number;
    chainIdB: number;
    tokenIdB: number;
}, {
    chainIdA: number;
    tokenIdA: number;
    chainIdB: number;
    tokenIdB: number;
}>;

/**
 * AckActionProvider lets AgentKit agents interact with ACK Protocol (ERC-8004).
 *
 * Read actions use the 8004scan public API. Write actions send onchain
 * transactions to the Identity Registry and Reputation Registry contracts.
 */
declare class AckActionProvider extends ActionProvider<EvmWalletProvider> {
    constructor();
    /**
     * Search for ERC-8004 agents by name or description.
     */
    searchAgents(_walletProvider: EvmWalletProvider, args: z.infer<typeof SearchAgentsSchema>): Promise<string>;
    /**
     * Get detailed info about a specific ERC-8004 agent.
     */
    getAgent(_walletProvider: EvmWalletProvider, args: z.infer<typeof GetAgentSchema>): Promise<string>;
    /**
     * Get an agent's reputation breakdown.
     */
    getReputation(_walletProvider: EvmWalletProvider, args: z.infer<typeof GetReputationSchema>): Promise<string>;
    /**
     * Get the feedback list for a specific agent.
     */
    getAgentFeedbacks(_walletProvider: EvmWalletProvider, args: z.infer<typeof GetAgentFeedbacksSchema>): Promise<string>;
    /**
     * Give onchain kudos to an agent via the Reputation Registry.
     */
    giveKudos(walletProvider: EvmWalletProvider, args: z.infer<typeof GiveKudosSchema>): Promise<string>;
    /**
     * Register a new ERC-8004 agent on the Identity Registry.
     */
    registerAgent(walletProvider: EvmWalletProvider, args: z.infer<typeof RegisterAgentSchema>): Promise<string>;
    /**
     * Update an existing agent's metadata URI.
     */
    updateAgentUri(walletProvider: EvmWalletProvider, args: z.infer<typeof UpdateAgentURISchema>): Promise<string>;
    /**
     * Tip an agent with USDC via x402.
     */
    tipAgent(_walletProvider: EvmWalletProvider, args: z.infer<typeof TipAgentSchema>): Promise<string>;
    /**
     * Get the 6 ERC-8004 trust categories.
     */
    getTrustCategories(_walletProvider: EvmWalletProvider, _args: z.infer<typeof GetTrustCategoriesSchema>): Promise<string>;
    /**
     * Get the agent leaderboard for a chain.
     */
    getLeaderboard(_walletProvider: EvmWalletProvider, args: z.infer<typeof GetLeaderboardSchema>): Promise<string>;
    /**
     * Compare reputation of two agents side by side.
     */
    compareAgents(_walletProvider: EvmWalletProvider, args: z.infer<typeof CompareAgentsSchema>): Promise<string>;
    /**
     * Any EVM chain is supported since the Identity Registry uses the same address everywhere.
     */
    supportsNetwork: (network: Network) => boolean;
}
/**
 * Factory function to create an AckActionProvider instance.
 */
declare const ackActionProvider: () => AckActionProvider;

/**
 * Identity Registry contract address (same on all EVM chains).
 */
declare const IDENTITY_REGISTRY_ADDRESS: "0x8004a169fb4a3325136eb29fa0ceb6d2e539a432";
/**
 * Reputation Registry contract address (same on all EVM chains).
 */
declare const REPUTATION_REGISTRY_ADDRESS: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63";
/**
 * 8004scan public API base URL.
 */
declare const API_BASE_URL: "https://www.8004scan.io/api/v1/public";
/**
 * ABI for Identity Registry - register and setAgentURI functions.
 */
declare const IDENTITY_REGISTRY_ABI: readonly [{
    readonly inputs: readonly [{
        readonly internalType: "string";
        readonly name: "agentURI";
        readonly type: "string";
    }];
    readonly name: "register";
    readonly outputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "agentId";
        readonly type: "uint256";
    }, {
        readonly internalType: "string";
        readonly name: "agentURI";
        readonly type: "string";
    }];
    readonly name: "setAgentURI";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}];
/**
 * ABI for Reputation Registry - giveFeedback function.
 */
declare const REPUTATION_REGISTRY_ABI: readonly [{
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "agentId";
        readonly type: "uint256";
    }, {
        readonly internalType: "int128";
        readonly name: "value";
        readonly type: "int128";
    }, {
        readonly internalType: "uint8";
        readonly name: "valueDecimals";
        readonly type: "uint8";
    }, {
        readonly internalType: "string";
        readonly name: "tag1";
        readonly type: "string";
    }, {
        readonly internalType: "string";
        readonly name: "tag2";
        readonly type: "string";
    }, {
        readonly internalType: "string";
        readonly name: "endpoint";
        readonly type: "string";
    }, {
        readonly internalType: "string";
        readonly name: "feedbackURI";
        readonly type: "string";
    }, {
        readonly internalType: "bytes32";
        readonly name: "feedbackHash";
        readonly type: "bytes32";
    }];
    readonly name: "giveFeedback";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}];

export { API_BASE_URL, AckActionProvider, CompareAgentsSchema, GetAgentFeedbacksSchema, GetAgentSchema, GetLeaderboardSchema, GetReputationSchema, GetTrustCategoriesSchema, GiveKudosSchema, IDENTITY_REGISTRY_ABI, IDENTITY_REGISTRY_ADDRESS, REPUTATION_REGISTRY_ABI, REPUTATION_REGISTRY_ADDRESS, RegisterAgentSchema, SearchAgentsSchema, TipAgentSchema, UpdateAgentURISchema, ackActionProvider };
