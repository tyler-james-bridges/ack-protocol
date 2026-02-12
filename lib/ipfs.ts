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
