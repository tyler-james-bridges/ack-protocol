import { Mppx, tempo } from 'mppx/server';
import { mapMppError, type MppUserError } from './mpp-errors';

export interface MppChallenge {
  realm: string;
  payTo: string;
  asset: string;
  instruction: string;
}

export interface MppConfig {
  realm: string;
  payTo: string;
  asset: string;
}

export interface VerifyMppOptions {
  amount: string;
}

export function mppEnabled(): boolean {
  return process.env.MPP_ENABLED === 'true';
}

export function getMppConfig(): MppConfig {
  const realm = process.env.MPP_REALM || '';
  const payTo =
    process.env.MPP_PAY_TO || process.env.AGENT_WALLET_ADDRESS || '';
  const asset = process.env.MPP_ASSET || 'pathUSD';

  if (!realm) throw new Error('MPP_ENABLED=true requires MPP_REALM');
  if (!payTo)
    throw new Error(
      'MPP_ENABLED=true requires MPP_PAY_TO (or AGENT_WALLET_ADDRESS fallback)'
    );

  return { realm, payTo, asset };
}

export function buildMppChallenge(config?: MppConfig): MppChallenge {
  const c = config ?? getMppConfig();
  return {
    realm: c.realm,
    payTo: c.payTo,
    asset: c.asset,
    instruction: 'Provide Authorization: Payment <credential>',
  };
}

// --- mppx server singleton ---

type MppChargeResult =
  | { status: 402; challenge: Response }
  | { status: 200; withReceipt: (response: Response) => Response };

type MppChargeFn = (options: {
  amount: string;
  currency: string;
}) => (request: Request) => Promise<MppChargeResult>;

interface MppServerInstance {
  charge: MppChargeFn;
}

let mppxServer: MppServerInstance | null = null;

function getMppxServer(config: MppConfig): MppServerInstance {
  if (mppxServer) return mppxServer;

  const secretKey = process.env.MPP_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      'MPP_ENABLED=true requires MPP_SECRET_KEY for credential verification'
    );
  }

  const server = Mppx.create({
    realm: config.realm,
    secretKey,
    methods: [
      tempo.charge({
        recipient: config.payTo as `0x${string}`,
      }),
    ],
  });

  // The mppx server exposes `charge` as a nested handler: server.tempo.charge
  // or server['tempo/charge']. Normalize to our interface.
  mppxServer = {
    charge: (options: { amount: string; currency: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handler = (server as any).charge ?? (server as any)['tempo/charge'];
      if (typeof handler !== 'function') {
        throw new Error(
          'mppx server does not expose a charge handler. Check mppx version.'
        );
      }
      return handler(options);
    },
  };

  return mppxServer;
}

/**
 * Build a 402 challenge response with proper WWW-Authenticate headers
 * using the mppx server SDK.
 */
export async function buildMppChallengeResponse(options: {
  amount: string;
}): Promise<Response> {
  const config = getMppConfig();
  const server = getMppxServer(config);

  const handler = server.charge({
    amount: options.amount,
    currency: config.asset,
  });

  // Send a request with no credential to get the 402 challenge
  const request = new Request(`https://${config.realm}/mpp-challenge`, {
    method: 'GET',
  });

  const result = await handler(request);
  if (result.status !== 402) {
    throw new Error('Failed to build MPP challenge');
  }

  return result.challenge;
}

/**
 * Verify an MPP credential from the Authorization header.
 *
 * Returns `{ ok: true, receiptId }` on success, or `{ ok: false, error, userError }`
 * with a mapped user-friendly error on failure.
 */
export async function verifyMppCredential(
  authHeader: string | null,
  options: VerifyMppOptions
): Promise<{
  ok: boolean;
  receiptId?: string;
  error?: string;
  userError?: MppUserError;
}> {
  const credential = extractCredential(authHeader);
  if (!credential) return { ok: false };

  const config = getMppConfig();

  let server: MppServerInstance;
  try {
    server = getMppxServer(config);
  } catch (err) {
    const userError = mapMppError(err);
    return { ok: false, error: userError.message, userError };
  }

  const handler = server.charge({
    amount: options.amount,
    currency: config.asset,
  });

  const request = new Request(`https://${config.realm}/mpp-verify`, {
    method: 'GET',
    headers: {
      authorization: `Payment ${credential}`,
    },
  });

  let result: MppChargeResult;
  try {
    result = await handler(request);
  } catch (err) {
    const userError = mapMppError(err);
    return { ok: false, error: userError.message, userError };
  }

  if (result.status !== 200) {
    // The challenge response body may contain RFC 9457 problem details
    let problemDetail: string | undefined;
    try {
      const body = await (result.challenge as Response).json();
      problemDetail =
        (body as Record<string, string>).detail ||
        (body as Record<string, string>).title;
    } catch {
      // Not JSON — that is fine
    }

    const userError = mapMppError(
      problemDetail || 'MPP credential verification failed'
    );
    return { ok: false, error: userError.message, userError };
  }

  const receiptResponse = result.withReceipt(new Response(null));
  const receiptId =
    receiptResponse.headers.get('payment-receipt') ||
    receiptResponse.headers.get('Payment-Receipt') ||
    credential;

  return { ok: true, receiptId };
}

// --- internal helpers ---

function extractCredential(authHeader: string | null): string | null {
  if (!authHeader) return null;
  if (!authHeader.toLowerCase().startsWith('payment ')) return null;
  const credential = authHeader.slice('Payment '.length).trim();
  return credential || null;
}

/**
 * Reset the cached mppx server instance. Useful for testing.
 */
export function resetMppxServer(): void {
  mppxServer = null;
}
