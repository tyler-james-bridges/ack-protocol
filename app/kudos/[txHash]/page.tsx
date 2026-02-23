'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface KudosData {
  txHash: string;
  agentId: number;
  agentName: string;
  sender: string;
  senderName: string;
  value: number;
  category: string;
  message: string;
  from: string;
  source: string;
  timestamp: string;
  blockNumber: string;
}

export default function KudosPermalink() {
  const params = useParams();
  const txHash = params.txHash as string;
  const [data, setData] = useState<KudosData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!txHash) return;
    fetch(`/api/kudos/${txHash}`)
      .then((r) => {
        if (!r.ok) throw new Error('Kudos not found');
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [txHash]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-lg">Loading kudos...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
        <div className="text-gray-400 text-lg">Kudos not found</div>
        <Link
          href="/kudos"
          className="text-green-400 hover:text-green-300 underline"
        >
          View all kudos
        </Link>
      </div>
    );
  }

  const isNegative = data.value < 0;
  const accentColor = isNegative ? 'red' : 'green';

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {/* Top accent */}
          <div
            className={`h-1 ${isNegative ? 'bg-red-500' : 'bg-green-500'}`}
          />

          <div className="p-8">
            {/* Badge */}
            <div className="flex items-center gap-3 mb-6">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${
                  isNegative
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : 'bg-green-500/10 text-green-400 border border-green-500/20'
                }`}
              >
                {isNegative ? '👎' : '👍'}{' '}
                {isNegative ? 'Negative Feedback' : 'Kudos'}
              </span>
              {data.category && data.category !== 'kudos' && (
                <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-gray-800 text-gray-300 border border-gray-700">
                  {data.category}
                </span>
              )}
            </div>

            {/* From → To */}
            <div className="mb-6">
              <div className="text-gray-500 text-sm mb-1">from</div>
              <div className="text-white text-xl font-bold mb-4">
                {data.from ||
                  data.senderName ||
                  data.sender.slice(0, 10) + '...'}
              </div>
              <div className="text-gray-500 text-sm mb-1">to</div>
              <div className={`text-2xl font-bold text-${accentColor}-400`}>
                {data.agentName || `Agent #${data.agentId}`}
              </div>
            </div>

            {/* Message */}
            {data.message && (
              <div
                className={`border-l-2 ${
                  isNegative ? 'border-red-500/30' : 'border-green-500/30'
                } pl-4 mb-6`}
              >
                <p className="text-gray-300 text-lg italic">
                  &ldquo;{data.message}&rdquo;
                </p>
              </div>
            )}

            {/* Meta */}
            <div className="flex flex-col gap-2 text-sm text-gray-500 border-t border-gray-800 pt-4">
              <div className="flex justify-between">
                <span>Chain</span>
                <span className="text-gray-400">Abstract</span>
              </div>
              <div className="flex justify-between">
                <span>Block</span>
                <span className="text-gray-400">{data.blockNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Time</span>
                <span className="text-gray-400">
                  {new Date(data.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tx</span>
                <a
                  href={`https://abscan.org/tx/${data.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 hover:text-green-300 truncate ml-4"
                >
                  {data.txHash.slice(0, 16)}...
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <Link
            href="/kudos"
            className={`w-full text-center py-3 px-6 rounded-lg font-semibold text-white ${
              isNegative
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-green-600 hover:bg-green-500'
            } transition-colors`}
          >
            Give Kudos
          </Link>
          <span className="text-gray-600 text-sm">
            Onchain reputation via ERC-8004
          </span>
        </div>
      </div>
    </div>
  );
}
