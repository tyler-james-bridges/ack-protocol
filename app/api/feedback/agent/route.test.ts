import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { ERC_8021_MARKER } from '@/config/builder-code';
import { POST } from './route';

const CALLER = '0x0000000000000000000000000000000000000001';

async function postFeedback(body: Record<string, unknown>) {
  const request = new NextRequest('http://localhost/api/feedback/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const response = await POST(request);
  return { status: response.status, json: await response.json() };
}

describe('POST /api/feedback/agent', () => {
  it('defaults the unsigned transaction to Base and appends the ERC-8021 suffix', async () => {
    const { status, json } = await postFeedback({
      targetAgentId: 606,
      value: 5,
      callerAddress: CALLER,
      category: 'reliability',
      reasoning: 'solid',
    });

    expect(status).toBe(200);
    expect(json.transaction.chainId).toBe(8453);
    expect(json.transaction.data.toLowerCase().endsWith(ERC_8021_MARKER)).toBe(
      true
    );
  });

  it('leaves Abstract calldata without the Base suffix', async () => {
    const { status, json } = await postFeedback({
      targetAgentId: 606,
      value: 4,
      callerAddress: CALLER,
      chainId: 2741,
    });

    expect(status).toBe(200);
    expect(json.transaction.chainId).toBe(2741);
    expect(json.transaction.data.toLowerCase().endsWith(ERC_8021_MARKER)).toBe(
      false
    );
  });
});
