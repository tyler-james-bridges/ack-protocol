#!/usr/bin/env npx tsx
/**
 * Register the ACK reputation tool on the ERC-8257 ToolRegistry (Base).
 *
 * Pattern follows Morsel Tool #28:
 *   https://github.com/tyler-james-bridges/morsel/blob/main/scripts/register-tool.ts
 *
 * Usage:
 *   npx tsx scripts/register-tool.ts --dry-run
 *   PRIVATE_KEY=0x... npx tsx scripts/register-tool.ts
 *   PRIVATE_KEY=0x... RPC_URL=https://mainnet.base.org npx tsx scripts/register-tool.ts
 *
 * Flags:
 *   --dry-run    Print summary without transacting
 *   --network    base (default) or mainnet
 *   --local      Use the local TypeScript manifest instead of the live well-known URL
 *
 * Live registration requires PRIVATE_KEY for the creatorAddress in the
 * manifest. This environment does not invent or embed secrets. If the key
 * is missing, the script prints a checklist and exits 0 on --dry-run or 1
 * otherwise.
 *
 * After a successful register:
 *   npx @opensea/tool-sdk inspect --tool-id <id> --network base
 *   npx @opensea/tool-sdk verify https://ack-onchain.dev/.well-known/ai-tool/ack-reputation.json
 */

import { createWalletClient, http, type Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, mainnet } from 'viem/chains';
import { buildAckReputationManifest } from '../lib/tool-manifest';
import { dataSuffixForChainId } from '../config/builder-code';

const LIVE_METADATA_URI =
  'https://ack-onchain.dev/.well-known/ai-tool/ack-reputation.json';

type SdkModule = {
  computeManifestHash: (manifest: unknown) => string;
  validateManifest: (manifest: unknown) => {
    success: boolean;
    error?: unknown;
  };
  ToolRegistryClient: new (opts: { chain: Chain; walletClient: unknown }) => {
    registerTool: (opts: {
      metadataURI: string;
      manifest: unknown;
    }) => Promise<{ toolId: bigint | number | string; txHash: string }>;
  };
};

async function loadSdk(): Promise<SdkModule | null> {
  try {
    return (await import('@opensea/tool-sdk')) as SdkModule;
  } catch {
    return null;
  }
}

function printChecklist(
  manifest: ReturnType<typeof buildAckReputationManifest>
) {
  console.log('');
  console.log('Onchain registration checklist');
  console.log('------------------------------');
  console.log('1. Deploy / ship so the well-known URL is live:');
  console.log(`     ${LIVE_METADATA_URI}`);
  console.log('2. Confirm the served JSON matches this local manifest');
  console.log('   (name, endpoint, creatorAddress, pricing, inputs.enum).');
  console.log('3. Set PRIVATE_KEY for the creator / payout wallet');
  console.log(`   (expected creatorAddress: ${manifest.creatorAddress}).`);
  console.log('   Do not commit the key. AGENT_PRIVATE_KEY is also accepted.');
  console.log('4. Optional: RPC_URL (defaults to https://mainnet.base.org).');
  console.log('5. Register:');
  console.log(
    '     PRIVATE_KEY=0x... npx tsx scripts/register-tool.ts --network=base'
  );
  console.log('   or:');
  console.log('     PRIVATE_KEY=0x... npx @opensea/tool-sdk register \\');
  console.log(`       --metadata ${LIVE_METADATA_URI} \\`);
  console.log('       --network base');
  console.log('6. Verify:');
  console.log('     npx @opensea/tool-sdk verify ' + LIVE_METADATA_URI);
  console.log(
    '     npx @opensea/tool-sdk inspect --tool-id <id> --network base'
  );
  console.log('');
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const useLocal = args.includes('--local');
  const networkArg = args.find((a) => a.startsWith('--network='));
  const networkName = networkArg?.split('=')[1] || 'base';

  const localManifest = buildAckReputationManifest();
  const metadataURI = LIVE_METADATA_URI;

  let manifest: unknown = localManifest;
  if (!useLocal && !dryRun) {
    try {
      const res = await fetch(metadataURI);
      if (res.ok) {
        manifest = await res.json();
        console.log(`[ok] Loaded live manifest from ${metadataURI}`);
      } else {
        console.warn(
          `[warn] Live manifest HTTP ${res.status}; falling back to local manifest. Use --local to silence this.`
        );
      }
    } catch (error) {
      console.warn(
        `[warn] Could not fetch live manifest (${error instanceof Error ? error.message : String(error)}); using local.`
      );
    }
  } else {
    console.log('[ok] Using local lib/tool-manifest.ts');
  }

  const sdk = await loadSdk();
  if (sdk) {
    const validation = sdk.validateManifest(manifest);
    if (!validation.success) {
      console.error('Manifest validation failed:');
      console.error(JSON.stringify(validation.error, null, 2));
      process.exit(1);
    }
    console.log('[ok] Manifest validates against ERC-8257 schema');
    const manifestHash = sdk.computeManifestHash(manifest);
    console.log(`[ok] Manifest hash: ${manifestHash}`);
  } else {
    console.warn(
      '[warn] @opensea/tool-sdk is not installed. Skipping schema validate/hash.'
    );
    console.warn('       Run: npx @opensea/tool-sdk validate <manifest.json>');
  }

  const summary = manifest as ReturnType<typeof buildAckReputationManifest>;
  console.log('');
  console.log('Registration summary:');
  console.log(`  Name:         ${summary.name}`);
  console.log(`  Endpoint:     ${summary.endpoint}`);
  console.log(`  Metadata URI: ${metadataURI}`);
  console.log(`  Creator:      ${summary.creatorAddress}`);
  console.log(`  Price:        $0.01 USDC (Base + Abstract x402)`);
  console.log(`  Network:      ${networkName}`);
  console.log(
    '  Predicate:    none (open access; x402 advertised in manifest)'
  );
  console.log('');

  if (dryRun) {
    printChecklist(localManifest);
    console.log(
      '[dry-run] Would register tool with above parameters. Exiting.'
    );
    process.exit(0);
  }

  const pk = process.env.PRIVATE_KEY || process.env.AGENT_PRIVATE_KEY;
  if (!pk) {
    console.error(
      'PRIVATE_KEY (or AGENT_PRIVATE_KEY) is required for live registration.'
    );
    printChecklist(localManifest);
    process.exit(1);
  }

  if (!sdk) {
    console.error('@opensea/tool-sdk is required for live registration.');
    console.error(
      'Install it or use: npx @opensea/tool-sdk register --metadata ...'
    );
    printChecklist(localManifest);
    process.exit(1);
  }

  const chain: Chain = networkName === 'mainnet' ? mainnet : base;
  const rpcUrl =
    process.env.RPC_URL ||
    (chain.id === 8453 ? 'https://mainnet.base.org' : undefined);

  const account = privateKeyToAccount(pk as `0x${string}`);
  console.log(`[ok] Wallet: ${account.address}`);

  if (account.address.toLowerCase() !== summary.creatorAddress.toLowerCase()) {
    console.warn(
      `[warn] Signer ${account.address} does not match manifest creatorAddress ${summary.creatorAddress}.`
    );
  }

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
    dataSuffix: dataSuffixForChainId(chain.id),
  });

  const registry = new sdk.ToolRegistryClient({
    chain,
    walletClient,
  });

  console.log('Registering tool onchain...');
  const result = await registry.registerTool({
    metadataURI,
    manifest,
  });

  console.log('');
  console.log('Registration complete!');
  console.log(`  Tool ID: ${result.toolId}`);
  console.log(`  Tx hash: ${result.txHash}`);
  console.log(`  Explorer: https://basescan.org/tx/${result.txHash}`);
  console.log('');
  console.log('Verify with:');
  console.log(
    `  npx @opensea/tool-sdk inspect --tool-id ${result.toolId} --network ${networkName}`
  );
  console.log(`  npx @opensea/tool-sdk verify ${metadataURI}`);
}

main().catch((err) => {
  console.error(
    'Registration failed:',
    err instanceof Error ? err.message : err
  );
  process.exit(1);
});
