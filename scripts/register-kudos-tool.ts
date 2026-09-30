#!/usr/bin/env npx tsx
/**
 * Register the ACK kudos & tips tool on the ERC-8257 registry (Base).
 *
 * Same Morsel register-tool pattern: validate the served manifest, hash it,
 * then call registerTool. Does not invent or commit secrets.
 *
 * Dry-run (no wallet, no SDK required):
 *   npx tsx scripts/register-kudos-tool.ts --dry-run
 *
 * Live registration (requires a funded Base wallet):
 *   npm i -D @opensea/tool-sdk
 *   PRIVATE_KEY=0x... npx tsx scripts/register-kudos-tool.ts
 *
 * Optional:
 *   RPC_URL=https://mainnet.base.org
 *   --network=base   (default)
 *
 * Checklist before sending a tx:
 *   [ ] Manifest is live at https://ack-onchain.dev/.well-known/ai-tool/ack-kudos.json
 *   [ ] Manifest type/name/endpoint/pricing match lib/tools/kudos-manifest.ts
 *   [ ] creatorAddress is lowercase and equals the registering wallet
 *   [ ] PRIVATE_KEY is the creator wallet (never commit it)
 *   [ ] After tx: npx @opensea/tool-sdk inspect --tool-id <id> --network base
 *   [ ] After tx: npx @opensea/tool-sdk verify <metadataURI>
 */

import {
  ACK_KUDOS_METADATA_URI,
  ackKudosManifest,
} from '../lib/tools/kudos-manifest';
import { dataSuffixForChainId } from '../config/builder-code';

async function loadSdk() {
  try {
    return await import('@opensea/tool-sdk');
  } catch {
    return null;
  }
}

function printSummary(manifestHash?: string) {
  console.log('Registration summary:');
  console.log(`  Name: ${ackKudosManifest.name}`);
  console.log(`  Endpoint: ${ackKudosManifest.endpoint}`);
  console.log(`  Metadata URI: ${ACK_KUDOS_METADATA_URI}`);
  console.log(`  Creator: ${ackKudosManifest.creatorAddress}`);
  console.log(
    `  Pricing: ${ackKudosManifest.pricing[0].amount} (${ackKudosManifest.pricing[0].asset}) via ${ackKudosManifest.pricing[0].protocol}`
  );
  if (manifestHash) {
    console.log(`  Hash: ${manifestHash}`);
  }
  console.log('  Network: base');
  console.log('  Predicate: none (open access; x402 enforced at the endpoint)');
  console.log('');
}

function printChecklist() {
  console.log('Onchain registration checklist:');
  console.log(
    '  1. Deploy this branch so the well-known manifest is served at ACK_KUDOS_METADATA_URI'
  );
  console.log(
    '  2. Confirm GET https://ack-onchain.dev/.well-known/ai-tool/ack-kudos.json returns 200'
  );
  console.log(
    '  3. Confirm creatorAddress matches the wallet that will call registerTool'
  );
  console.log(
    '  4. Install @opensea/tool-sdk and set PRIVATE_KEY (do not commit it)'
  );
  console.log(
    '  5. Re-run: PRIVATE_KEY=0x... npx tsx scripts/register-kudos-tool.ts'
  );
  console.log(
    '  6. Verify: npx @opensea/tool-sdk verify https://ack-onchain.dev/.well-known/ai-tool/ack-kudos.json'
  );
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const networkArg = args.find((a) => a.startsWith('--network='));
  const networkName = networkArg?.split('=')[1] || 'base';

  if (networkName !== 'base') {
    console.error(
      'Only --network=base is supported for ACK kudos registration.'
    );
    process.exit(1);
  }

  const sdk = await loadSdk();

  if (sdk) {
    const validation = sdk.validateManifest(ackKudosManifest);
    if (!validation.success) {
      console.error('Manifest validation failed:');
      console.error(JSON.stringify(validation.error, null, 2));
      process.exit(1);
    }
    console.log('[ok] Manifest validates against ERC-8257 schema');

    const manifestHash = sdk.computeManifestHash(ackKudosManifest);
    console.log(`[ok] Manifest hash: ${manifestHash}`);
    console.log('');
    printSummary(manifestHash);
  } else {
    console.log(
      '[warn] @opensea/tool-sdk is not installed. Skipping schema/hash checks.'
    );
    console.log('        npm i -D @opensea/tool-sdk');
    console.log('');
    printSummary();
  }

  if (dryRun) {
    console.log(
      '[dry-run] Would register the kudos tool with the above parameters.'
    );
    console.log('');
    printChecklist();
    process.exit(0);
  }

  const pk = process.env.PRIVATE_KEY;
  if (!pk) {
    console.error('PRIVATE_KEY env var required for registration.');
    console.error(
      'Usage: PRIVATE_KEY=0x... npx tsx scripts/register-kudos-tool.ts'
    );
    console.error(
      'Or dry-run: npx tsx scripts/register-kudos-tool.ts --dry-run'
    );
    console.log('');
    printChecklist();
    process.exit(1);
  }

  if (!sdk) {
    console.error('@opensea/tool-sdk is required for live registration.');
    console.error('Install it with: npm i -D @opensea/tool-sdk');
    process.exit(1);
  }

  const { createWalletClient, http } = await import('viem');
  const { privateKeyToAccount } = await import('viem/accounts');
  const { base } = await import('viem/chains');

  const account = privateKeyToAccount(pk as `0x${string}`);
  console.log(`[ok] Wallet: ${account.address}`);

  if (account.address.toLowerCase() !== ackKudosManifest.creatorAddress) {
    console.error(
      `Wallet ${account.address} does not match manifest creatorAddress ${ackKudosManifest.creatorAddress}`
    );
    process.exit(1);
  }

  const rpcUrl = process.env.RPC_URL || 'https://mainnet.base.org';
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(rpcUrl),
    dataSuffix: dataSuffixForChainId(base.id),
  });

  const registry = new sdk.ToolRegistryClient({
    chain: base,
    walletClient,
  });

  console.log('Registering kudos tool onchain (Base)...');
  const result = await registry.registerTool({
    metadataURI: ACK_KUDOS_METADATA_URI,
    manifest: ackKudosManifest,
  });

  console.log('');
  console.log('Registration complete!');
  console.log(`  Tool ID: ${result.toolId}`);
  console.log(`  Tx hash: ${result.txHash}`);
  console.log(`  Explorer: https://basescan.org/tx/${result.txHash}`);
  console.log('');
  console.log('Verify with:');
  console.log(
    `  npx @opensea/tool-sdk inspect --tool-id ${result.toolId} --network base`
  );
  console.log(`  npx @opensea/tool-sdk verify ${ACK_KUDOS_METADATA_URI}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('Registration failed:', message);
  process.exit(1);
});
