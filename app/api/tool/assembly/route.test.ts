import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/x402', () => ({
  withPayment: (handler: unknown) => handler,
}));

const mockHandleAssemblyTool = vi.fn();

vi.mock('@/lib/tools/assembly-handler', () => ({
  handleAssemblyTool: (...args: unknown[]) => mockHandleAssemblyTool(...args),
}));

import { GET, OPTIONS, POST } from './route';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/tool/assembly', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/tool/assembly', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns CORS headers on OPTIONS', async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('returns discovery payload on GET', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('ack-assembly');
    expect(body.actions).toEqual([
      'members',
      'member_detail',
      'proposals',
      'governance_stats',
    ]);
    expect(body.endpoint).toMatch(/\/api\/tool\/assembly$/);
    expect(body.pricingUsdc).toBe('0.02');
  });

  it('returns the handler payload and status', async () => {
    mockHandleAssemblyTool.mockResolvedValue({
      status: 200,
      body: { members: [], count: 0 },
    });

    const res = await POST(makeRequest({ action: 'members' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ members: [], count: 0 });
    expect(mockHandleAssemblyTool).toHaveBeenCalledWith({ action: 'members' });
  });

  it('forwards handler errors', async () => {
    mockHandleAssemblyTool.mockResolvedValue({
      status: 400,
      body: { error: 'action is required and must be a string' },
    });

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('action is required');
  });

  it('treats invalid JSON as a null body', async () => {
    mockHandleAssemblyTool.mockResolvedValue({
      status: 400,
      body: { error: 'Request body must be a JSON object' },
    });

    const req = new NextRequest('http://localhost:3000/api/tool/assembly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json{{{',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mockHandleAssemblyTool).toHaveBeenCalledWith(null);
  });
});
