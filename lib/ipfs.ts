import type { KudosPayload } from '@/lib/types';

/**
 * Upload kudos payload to IPFS via Pinata.
 * Returns the IPFS URI (ipfs://CID) for use as feedbackURI.
 *
 * Uses the Pinata API directly to avoid SDK bundle size.
 * Requires NEXT_PUBLIC_PINATA_JWT environment variable.
 */
export async function uploadKudosToIPFS(
  payload: KudosPayload
): Promise<string> {
  const response = await fetch('/api/ipfs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pinataContent: payload,
      pinataMetadata: {
        name: `kudos-${payload.agentId}-${Date.now()}`,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`IPFS upload failed: ${error}`);
  }

  const data = await response.json();
  return `ipfs://${data.IpfsHash}`;
}

/**
 * Resolve an IPFS URI to an HTTP gateway URL for fetching content.
 */
export function ipfsToHttp(uri: string): string {
  if (uri.startsWith('ipfs://')) {
    const cid = uri.replace('ipfs://', '');
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
  }
  return uri;
}

/**
 * Fetch and parse a JSON file from IPFS or HTTP.
 */
export async function fetchFromIPFS<T>(uri: string): Promise<T> {
  const url = ipfsToHttp(uri);
  const response = await fetch(url, { next: { revalidate: 300 } });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.json();
}
