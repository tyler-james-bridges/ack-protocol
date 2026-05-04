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
  const key = txHashes.join(',');

  useEffect(() => {
    if (txHashes.length === 0) return;
    fetch('/api/tips/by-kudos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txHashes }),
    })
      .then((r) => (r.ok ? r.json() : { tips: {} }))
      .then((data) => setTips(data.tips || {}))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return tips;
}
