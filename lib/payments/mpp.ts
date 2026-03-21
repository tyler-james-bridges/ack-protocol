import { Mppx, tempo } from 'mppx/server';

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

export interface BuildMppChallengeResponseOptions {
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

let mppxServer: any = null;

function getMppxServer(config: MppConfig): any {
  if (mppxServer) return mppxServer;

  const secretKey = process.env.MPP_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      'MPP_ENABLED=true requires MPP_SECRET_KEY for credential verification'
    );
  }

  mppxServer = Mppx.create({
    realm: config.realm,
    secretKey,
    methods: [
      tempo.charge({
        recipient: config.payTo as `0x${string}`,
      }),
    ],
  });

  return mppxServer;
}

function extractCredential(authHeader: string | null): string | null {
  if (!authHeader) return null;
  if (!authHeader.toLowerCase().startsWith('payment ')) return null;
  const credential = authHeader.slice('Payment '.length).trim();
  return credential || null;
}

export async function buildMppChallengeResponse(
  options: BuildMppChallengeResponseOptions
): Promise<Response> {
  const config = getMppConfig();
  const server = getMppxServer(config);

  const handler = server.charge({
    amount: options.amount,
    currency: config.asset,
  });

  const request = new Request(`https://${config.realm}/mpp-challenge`, {
    method: 'GET',
  });

  const result = await handler(request);
  if (result.status !== 402) {
    throw new Error('Failed to build MPP challenge');
  }

  return result.challenge;
}

export async function verifyMppCredential(
  authHeader: string | null,
  options: VerifyMppOptions
): Promise<{ ok: boolean; receiptId?: string; error?: string }> {
  const credential = extractCredential(authHeader);
  if (!credential) return { ok: false };

  const config = getMppConfig();
  const server = getMppxServer(config);

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

  const result = await handler(request);
  if (result.status !== 200) {
    return { ok: false, error: 'MPP credential verification failed' };
  }

  const receiptResponse = result.withReceipt(new Response(null));
  const receiptId =
    receiptResponse.headers.get('payment-receipt') ||
    receiptResponse.headers.get('Payment-Receipt') ||
    credential;

  return { ok: true, receiptId };
}
