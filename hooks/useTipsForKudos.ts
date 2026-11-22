'use client';

import { useEffect, useState } from 'react';

export interface TipFromAgent {
  name: string;
  imageUrl?: string;
  chainId: number;
  tokenId: string;
}

export interface TipInfo {
  amountUsd: number;
  chainId: number;
  fromAddress: string;
  fromAgentId?: number;
  fromAgent?: TipFromAgent;
}

export function useTipsForKudos(txHashes: string[]) {
  const [tips, setTips] = useState<Record<string, TipInfo>>({});
  const body = txHashes.length ? JSON.stringify({ txHashes }) : undefined;

  useEffect(() => {
    if (body === undefined) return;
    fetch('/api/tips/by-kudos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
      .then((r) => (r.ok ? r.json() : { tips: {} }))
      .then((data) => setTips(data.tips || {}))
      .catch(() => {});
  }, [body]);

  return tips;
}
