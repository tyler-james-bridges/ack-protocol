/**
 * Nevermined Agent Registration Script
 *
 * Registers ACK Protocol as an AI Agent on Nevermined and creates payment plans.
 * Run with: npx tsx scripts/nevermined-register.mts
 *
 * Required env vars:
 *   NVM_API_KEY - Nevermined API key with publication permissions
 *   NVM_ENVIRONMENT - 'sandbox' (default) or 'live'
 *   NEXT_PUBLIC_BASE_URL - Base URL of the ACK app (e.g. https://ack.gg)
 */

import 'dotenv/config';
import { Payments } from '@nevermined-io/payments';
import type {
  AgentMetadata,
  AgentAPIAttributes,
  PlanMetadata,
  EnvironmentName,
} from '@nevermined-io/payments';

const NVM_API_KEY = process.env.NVM_API_KEY;
const BUILDER_ADDRESS = '0x668aDd9213985E7Fd613Aec87767C892f4b9dF1c';
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || 'https://ack-protocol.vercel.app';
const ENVIRONMENT = (process.env.NVM_ENVIRONMENT ||
  'sandbox') as EnvironmentName;

if (!NVM_API_KEY) {
  console.error('NVM_API_KEY is required. Get one at https://nevermined.app');
  process.exit(1);
}

const payments = Payments.getInstance({
  nvmApiKey: NVM_API_KEY,
  environment: ENVIRONMENT,
});

// ACK agent endpoints with their credit costs
const ACK_ENDPOINTS = [
  {
    verb: 'POST',
    path: '/api/brain/decisions/{address}',
    description: 'Agent decision history',
    creditsPerRequest: 1,
  },
  {
    verb: 'POST',
    path: '/api/brain/strategy/{address}',
    description: 'Agent strategy analysis',
    creditsPerRequest: 5,
  },
  {
    verb: 'POST',
    path: '/api/portfolio/{address}/analysis',
    description: 'Portfolio analysis',
    creditsPerRequest: 2,
  },
  {
    verb: 'POST',
    path: '/api/signals/{address}',
    description: 'Trading signals',
    creditsPerRequest: 10,
  },
  {
    verb: 'POST',
    path: '/api/journal/{address}/full',
    description: 'Agent journal',
    creditsPerRequest: 1,
  },
];

async function registerPrepaidPlan(): Promise<string> {
  console.log('Creating prepaid credits plan: "ACK Data Access"...');

  const planMetadata: PlanMetadata = {
    name: 'ACK Data Access',
    description:
      'Prepaid credits plan for ACK Protocol API access. 100 credits for $1 USDC. Credits are consumed per-endpoint based on complexity.',
    tags: ['ack', 'defi', 'agents', 'onchain'],
  };

  // 1 USDC = 1_000_000 (6 decimals)
  const priceConfig = payments.plans.getERC20PriceConfig(
    1_000_000n,
    USDC_BASE as `0x${string}`,
    BUILDER_ADDRESS as `0x${string}`
  );

  const creditsConfig = payments.plans.getFixedCreditsConfig(100n, 1n);

  const { planId } = await payments.plans.registerCreditsPlan(
    planMetadata,
    priceConfig,
    creditsConfig
  );

  console.log(`Prepaid plan created: ${planId}`);
  return planId;
}

async function registerPayAsYouGoPlan(): Promise<string> {
  console.log('Creating pay-as-you-go plan: "ACK Pay Per Query"...');

  const planMetadata: PlanMetadata = {
    name: 'ACK Pay Per Query',
    description:
      'Pay-as-you-go access to ACK Protocol APIs. Credits are purchased and consumed per request.',
    tags: ['ack', 'defi', 'agents', 'payg'],
  };

  const priceConfig = await payments.plans.getPayAsYouGoPriceConfig(
    10_000n, // 0.01 USDC per credit (in token minor units)
    BUILDER_ADDRESS as `0x${string}`,
    USDC_BASE as `0x${string}`
  );

  const creditsConfig = payments.plans.getPayAsYouGoCreditsConfig();

  const { planId } = await payments.plans.registerPlan(
    planMetadata,
    priceConfig,
    creditsConfig
  );

  console.log(`Pay-as-you-go plan created: ${planId}`);
  return planId;
}

async function registerAgent(planIds: string[]): Promise<string> {
  console.log('Registering ACK agent...');

  const agentMetadata: AgentMetadata = {
    name: 'ACK Protocol',
    description:
      'Autonomous onchain agent intelligence. Access decision history, strategy analysis, portfolio insights, trading signals, and agent journals.',
    author: 'ACK Protocol',
    tags: ['ack', 'defi', 'agents', 'onchain', 'trading', 'portfolio'],
    apiDescription:
      'REST API endpoints for querying ACK agent data. Each endpoint accepts an address parameter and returns JSON.',
  };

  const endpoints = ACK_ENDPOINTS.map((ep) => ({
    [ep.verb]: `${BASE_URL}${ep.path}`,
  }));

  const agentApi: AgentAPIAttributes = {
    endpoints,
    openEndpoints: [`${BASE_URL}/api/health`],
    agentDefinitionUrl: `${BASE_URL}/api/x402`,
    authType: 'none' as const,
  };

  const { agentId } = await payments.agents.registerAgent(
    agentMetadata,
    agentApi,
    planIds
  );

  console.log(`Agent registered: ${agentId}`);
  return agentId;
}

async function main() {
  console.log(`Registering ACK on Nevermined (${ENVIRONMENT})...`);
  console.log(`Builder address: ${BUILDER_ADDRESS}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log('');

  const prepaidPlanId = await registerPrepaidPlan();
  const paygPlanId = await registerPayAsYouGoPlan();
  const agentId = await registerAgent([prepaidPlanId, paygPlanId]);

  console.log('');
  console.log('Registration complete.');
  console.log('');
  console.log('Add these to your .env.local:');
  console.log(`NVM_AGENT_ID=${agentId}`);
  console.log(`NVM_PREPAID_PLAN_ID=${prepaidPlanId}`);
  console.log(`NVM_PAYG_PLAN_ID=${paygPlanId}`);
  console.log('');
  console.log('Endpoint credit costs:');
  for (const ep of ACK_ENDPOINTS) {
    console.log(`  ${ep.verb} ${ep.path} - ${ep.creditsPerRequest} credit(s)`);
  }
}

main().catch((err) => {
  console.error('Registration failed:', err);
  process.exit(1);
});
