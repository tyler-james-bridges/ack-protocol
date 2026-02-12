import { NextRequest, NextResponse } from 'next/server';

const API_BASE = 'https://www.8004scan.io/api/v1';

/**
 * Proxy requests to 8004scan API to avoid CORS issues.
 * Forwards all query parameters as-is.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const path = searchParams.get('path') || 'agents';
  searchParams.delete('path');

  // Allowlist guard — only permit known safe paths to prevent SSRF.
  const ALLOWED_PATH = /^(agents(\/\d+\/[a-zA-Z0-9_-]+\/feedbacks)?|networks)$/;
  if (!ALLOWED_PATH.test(path)) {
    return NextResponse.json(
      { error: 'Invalid path parameter' },
      { status: 400 }
    );
  }

  const url = `${API_BASE}/${path}?${searchParams.toString()}`;

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: `Proxy error: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 502 }
    );
  }
}
