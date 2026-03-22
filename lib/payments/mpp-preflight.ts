/**
 * MPP preflight — checks whether the connected wallet can use MPP (Tempo) payments.
 *
 * Runs client-side before enabling the MPP payment option. If the preflight fails,
 * the UI keeps MPP visible but marks it unavailable with a human-readable reason.
 */

export interface MppPreflightResult {
  /** Whether MPP is viable for this wallet */
  viable: boolean;
  /** Human-readable reason when not viable */
  reason?: string;
  /** Machine-readable code for programmatic handling */
  code?: string;
}

/**
 * Check whether the given wallet account is compatible with MPP/Tempo payments.
 *
 * This is a lightweight client-side check that:
 * 1. Verifies the wallet client exists and has an account
 * 2. Attempts to detect Tempo chain support (json-rpc account type detection)
 * 3. Does NOT require a funded account (that would be a live check)
 *
 * @param walletClient - The viem WalletClient from wagmi
 * @returns Preflight result indicating viability
 */
export async function checkMppPreflight(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  walletClient: any
): Promise<MppPreflightResult> {
  // No wallet connected
  if (!walletClient) {
    return {
      viable: false,
      reason: 'Connect a wallet to use MPP payments.',
      code: 'NO_WALLET',
    };
  }

  // No account on the wallet client
  const account = walletClient.account;
  if (!account) {
    return {
      viable: false,
      reason: 'Wallet has no active account.',
      code: 'NO_ACCOUNT',
    };
  }

  // Check if the wallet supports the Tempo chain (chainId 978658).
  // json-rpc accounts (browser wallets like MetaMask) need Tempo chain added.
  // local/privateKey accounts work directly.
  if (account.type === 'json-rpc') {
    try {
      // Attempt to query the Tempo chain. If the wallet doesn't have it,
      // the RPC call will fail. We use a lightweight eth_chainId probe.
      const tempoChainId = 978658;
      const currentChainId = walletClient.chain?.id;

      // If the wallet is on a different chain, try switching to Tempo.
      // This is just a probe — we don't actually force a switch.
      if (currentChainId !== tempoChainId) {
        try {
          await walletClient.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${tempoChainId.toString(16)}` }],
          });
        } catch (switchErr: unknown) {
          const errCode =
            typeof switchErr === 'object' &&
            switchErr !== null &&
            'code' in switchErr
              ? (switchErr as { code: number }).code
              : undefined;

          // 4902 = chain not added to wallet
          if (errCode === 4902) {
            return {
              viable: false,
              reason:
                'Tempo network not configured in your wallet. MPP requires the Tempo chain.',
              code: 'TEMPO_CHAIN_NOT_ADDED',
            };
          }

          // User rejected the switch — that is fine, they can add it later
          if (errCode === 4001) {
            return {
              viable: false,
              reason:
                'Tempo network switch was declined. MPP requires the Tempo chain.',
              code: 'TEMPO_SWITCH_REJECTED',
            };
          }

          // Some wallets may not support wallet_switchEthereumChain at all.
          // In that case, we can't determine compatibility — mark as uncertain.
          return {
            viable: false,
            reason:
              'Could not verify Tempo chain support. Your wallet may not be MPP-compatible.',
            code: 'TEMPO_SWITCH_UNSUPPORTED',
          };
        }

        // Switch succeeded — switch back to the original chain so we don't
        // leave the user on Tempo unexpectedly.
        if (currentChainId) {
          try {
            await walletClient.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${currentChainId.toString(16)}` }],
            });
          } catch {
            // Best-effort switch back; not critical
          }
        }
      }

      // If we got here, the wallet can talk to Tempo
      return { viable: true };
    } catch {
      return {
        viable: false,
        reason:
          'Could not verify Tempo compatibility. Try x402 or direct transfer.',
        code: 'TEMPO_CHECK_FAILED',
      };
    }
  }

  // For non-json-rpc accounts (privateKey, local, smart contract wallets),
  // mppx handles chain routing internally — assume viable.
  return { viable: true };
}
