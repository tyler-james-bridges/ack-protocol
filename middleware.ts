import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Add API version header to all API responses
  if (request.nextUrl.pathname.startsWith('/api')) {
    response.headers.set('X-API-Version', '1');
  }

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
