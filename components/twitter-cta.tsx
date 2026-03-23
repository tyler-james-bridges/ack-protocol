'use client';

import { useState, useMemo } from 'react';
import { parsePostPreview, type ParsedKudos } from '@/lib/parse-kudos';

export function TwitterCTA() {
  const [text, setText] = useState('ACK: @ack_onchain @agent ++');
  const parsed = useMemo(() => parsePostPreview(text), [text]);
  const postIntentUrl = `https://x.com/intent/post?text=${encodeURIComponent(text)}`;

  return (
    <div className="mt-5 border-2 border-black p-4 max-w-lg mx-auto lg:mx-0">
      <p className="text-xs text-black/50 mb-2">
        Give kudos to any AI agent directly from X
      </p>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          className="flex-1 rounded-none bg-black/5/40 border border-black/20/50 px-3 py-2 text-sm font-mono text-black outline-none focus:border-black transition-colors min-w-0"
        />
        <CopyButton text={text} />
        <a
          href={postIntentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-none bg-black text-white px-3 py-2 text-sm font-medium hover:bg-white hover:text-black border-2 border-black transition-colors shrink-0"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Post
        </a>
      </div>

      {/* Dry-run preview */}
      {parsed.length > 0 ? (
        <div className="mt-3 space-y-1.5">
          {parsed.map((k, i) => (
            <PreviewRow key={i} kudos={k} />
          ))}
        </div>
      ) : text.trim().length > 0 && text !== 'ACK: @ack_onchain' ? (
        <p className="mt-3 text-xs text-black/50/60">
          No kudos detected - try{' '}
          <span className="font-mono">ACK: @ack_onchain @agent ++</span>
        </p>
      ) : null}
    </div>
  );
}

function PreviewRow({ kudos }: { kudos: ParsedKudos }) {
  const isPositive = kudos.sentiment === 'positive';
  return (
    <div className="flex items-center gap-2 text-xs flex-wrap">
      <span
        className={`inline-flex items-center gap-1 rounded-none px-1.5 py-0.5 font-medium ${
          isPositive
            ? 'bg-black text-white'
            : 'bg-white text-black border border-black'
        }`}
      >
        {isPositive ? '+' : '-'}
        {kudos.amount}
      </span>
      <span className="text-black/50">to</span>
      <span className="font-mono font-medium text-black">
        @{kudos.targetHandle}
      </span>
      {kudos.category && (
        <span className="border border-black/10 px-1.5 py-0.5 text-black/50">
          {kudos.category}
        </span>
      )}
      {kudos.message && (
        <span className="text-black/50 truncate max-w-[200px]">
          &ldquo;{kudos.message}&rdquo;
        </span>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center justify-center border-2 border-black px-2.5 py-2 text-sm text-black/50 hover:text-black hover:bg-black/5/50 transition-colors shrink-0"
      title="Copy to clipboard"
    >
      {copied ? (
        <svg
          className="h-4 w-4 text-black"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      ) : (
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      )}
    </button>
  );
}
