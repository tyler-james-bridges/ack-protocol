import { NextRequest, NextResponse } from 'next/server';

const ACME_CHALLENGES: Record<string, string> = {
  azF2Nm0xcmg3NGxxZjN0cm5oa243aDE5YTM:
    'azF2Nm0xcmg3NGxxZjN0cm5oa243aDE5YTM.bQkXdLNf6_z0C-6GZ-knMbS8r4NudOhPqV9x2VpUUP8',
};

export function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  return params.then(({ token }) => {
    const auth = ACME_CHALLENGES[token];
    if (!auth) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return new NextResponse(auth, {
      headers: { 'Content-Type': 'text/plain' },
    });
  });
}
