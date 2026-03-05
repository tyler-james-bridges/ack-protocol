/**
 * Playwright fixture that injects a test wallet as window.ethereum.
 *
 * Uses AGENT_PRIVATE_KEY from .env.local (the ACK openclaw agent wallet).
 * Or pass TEST_WALLET_KEY explicitly:
 *   TEST_WALLET_KEY=0xabc... npx playwright test tests/x402-tip-e2e.spec.ts --headed --workers=1
 *
 * The wallet needs:
 *   - ETH on Abstract (2741) for gas
 *   - USDC for tip tests
 *   - PENGU for PENGU tip tests
 */

import 'dotenv/config';
import { resolve } from 'path';
import { config } from 'dotenv';
import { test as base, expect } from '@playwright/test';

// Load .env.local (Next.js convention)
config({ path: resolve(__dirname, '../../.env.local') });
import {
  createWalletClient,
  createPublicClient,
  http,
  type Hex,
  type TransactionRequest,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { abstract } from 'viem/chains';

const ABSTRACT_RPC = 'https://api.mainnet.abs.xyz';
const CHAIN_ID_HEX = '0xab5'; // 2741

function getTestKey(): Hex {
  const key = process.env.AGENT_PRIVATE_KEY || process.env.TEST_WALLET_KEY;
  if (!key)
    throw new Error('AGENT_PRIVATE_KEY or TEST_WALLET_KEY env var is required');
  return (key.startsWith('0x') ? key : `0x${key}`) as Hex;
}

export const test = base.extend({
  page: async ({ page }, use) => {
    const account = privateKeyToAccount(getTestKey());
    const address = account.address;

    const walletClient = createWalletClient({
      account,
      chain: abstract,
      transport: http(ABSTRACT_RPC),
    });

    const publicClient = createPublicClient({
      chain: abstract,
      transport: http(ABSTRACT_RPC),
    });

    // Expose RPC handler to the browser
    await page.exposeFunction(
      '__testWalletRequest',
      async (method: string, params: unknown[]) => {
        switch (method) {
          case 'eth_requestAccounts':
          case 'eth_accounts':
            return [address];

          case 'eth_chainId':
            return CHAIN_ID_HEX;

          case 'net_version':
            return '2741';

          case 'wallet_switchEthereumChain':
          case 'wallet_addEthereumChain':
            return null;

          case 'eth_sendTransaction': {
            const tx = params[0] as TransactionRequest;
            const hash = await walletClient.sendTransaction({
              to: tx.to as Hex,
              data: (tx.data as Hex) || undefined,
              value: tx.value
                ? BigInt(tx.value as unknown as string)
                : undefined,
              gas: tx.gas ? BigInt(tx.gas as unknown as string) : undefined,
            });
            return hash;
          }

          case 'personal_sign': {
            const message = params[0] as string;
            return account.signMessage({ message });
          }

          case 'eth_signTypedData_v4': {
            const typedData = JSON.parse(params[1] as string);
            return account.signTypedData(typedData);
          }

          case 'eth_getBalance': {
            const bal = await publicClient.getBalance({
              address: params[0] as string as Hex,
            });
            return '0x' + bal.toString(16);
          }

          case 'eth_call':
          case 'eth_estimateGas':
          case 'eth_getTransactionCount':
          case 'eth_getTransactionReceipt':
          case 'eth_getTransactionByHash':
          case 'eth_blockNumber':
          case 'eth_getBlockByNumber':
          case 'eth_getCode':
          case 'eth_getLogs': {
            // Forward to RPC
            const res = await fetch(ABSTRACT_RPC, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: Date.now(),
                method,
                params,
              }),
            });
            const json = await res.json();
            if (json.error) throw new Error(json.error.message);
            return json.result;
          }

          default:
            throw new Error(`Unhandled method: ${method}`);
        }
      }
    );

    // Inject window.ethereum before any page JS runs
    await page.addInitScript((addr: string) => {
      const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};

      const provider = {
        isMetaMask: false,
        isConnected: () => true,
        chainId: '0xab5',
        selectedAddress: addr,
        networkVersion: '2741',

        request: async ({
          method,
          params,
        }: {
          method: string;
          params?: unknown[];
        }) => {
          return (window as any).__testWalletRequest(method, params || []);
        },

        on: (event: string, cb: (...args: unknown[]) => void) => {
          if (!listeners[event]) listeners[event] = [];
          listeners[event].push(cb);
          return provider;
        },
        removeListener: (event: string, cb: (...args: unknown[]) => void) => {
          if (listeners[event]) {
            listeners[event] = listeners[event].filter((l) => l !== cb);
          }
          return provider;
        },
        removeAllListeners: () => {
          Object.keys(listeners).forEach((k) => delete listeners[k]);
          return provider;
        },
        emit: (event: string, ...args: unknown[]) => {
          (listeners[event] || []).forEach((cb) => cb(...args));
        },
      };

      (window as any).ethereum = provider;

      // EIP-6963: Announce wallet so wagmi/RainbowKit discovers it
      const info = Object.freeze({
        uuid: 'ack-test-wallet',
        name: 'Browser Wallet',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
        rdns: 'dev.ack.testwallet',
      });

      const announce = () =>
        window.dispatchEvent(
          new CustomEvent('eip6963:announceProvider', {
            detail: Object.freeze({ info, provider }),
          })
        );

      announce();
      window.addEventListener('eip6963:requestProvider', announce);
    }, address);

    await use(page);
  },
});

export { expect };
