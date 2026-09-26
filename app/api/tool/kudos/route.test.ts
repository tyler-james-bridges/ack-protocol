import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/x402', () => ({
  withPayment: (handler: unknown) => handler,
}));

const mockHandleKudosTool = vi.fn();

vi.mock('@/lib/tools/kudos-handler', () => ({
  handleKudosTool: (...args: unknown[]) => mockHandleKudosTool(...args),
}));

import { OPTIONS, POST } from './route';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/tool/kudos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/tool/kudos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns CORS headers on OPTIONS', async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('returns the handler payload and status', async () => {
    mockHandleKudosTool.mockResolvedValue({
      status: 200,
      body: { items: [], total: 0 },
    });

    const res = await POST(makeRequest({ action: 'kudos_feed' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ items: [], total: 0 });
    expect(mockHandleKudosTool).toHaveBeenCalledWith({ action: 'kudos_feed' });
  });

  it('forwards handler errors', async () => {
    mockHandleKudosTool.mockResolvedValue({
      status: 400,
      body: { error: 'action is required and must be a string' },
    });

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('action is required');
  });

  it('treats invalid JSON as a null body', async () => {
    mockHandleKudosTool.mockResolvedValue({
      status: 400,
      body: { error: 'Request body must be a JSON object' },
    });

    const req = new NextRequest('http://localhost:3000/api/tool/kudos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json{{{',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mockHandleKudosTool).toHaveBeenCalledWith(null);
  });
});
