import { describe, expect, it } from 'vitest';
import { base } from 'viem/chains';
import { SUPPORTED_CHAINS } from '@/config/chains';
import { wagmiConfig } from '@/config/wagmi';

describe('wagmi config', () => {
  it('includes every chain offered on /register', () => {
    const configured = new Map(
      wagmiConfig.chains.map((chain) => [chain.id, chain])
    );

    for (const { chain } of SUPPORTED_CHAINS) {
      const walletChain = configured.get(chain.id);
      if (!walletChain) {
        throw new Error(
          `${chain.name} (${chain.id}) is missing from the wallet config`
        );
      }

      const rpcUrl = chain.rpcUrls.default.http[0];
      expect(rpcUrl, `${chain.name} RPC`).toEqual(expect.any(String));
      expect(rpcUrl.length).toBeGreaterThan(0);
      expect(walletChain.name).toBe(chain.name);
      expect(walletChain.rpcUrls.default.http[0]).toBe(rpcUrl);
      expect(walletChain.blockExplorers?.default.url).toBe(
        chain.blockExplorers?.default.url
      );
      expect(walletChain.nativeCurrency).toEqual(chain.nativeCurrency);
      expect(wagmiConfig.getClient({ chainId: chain.id }).chain.id).toBe(
        chain.id
      );
    }
  });

  it('keeps Base as the default chain', () => {
    expect(wagmiConfig.chains[0].id).toBe(base.id);
    expect(wagmiConfig.getClient().chain.id).toBe(base.id);
  });
});
