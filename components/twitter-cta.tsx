'use client';

import { useState, useMemo } from 'react';
import { parsePostPreview, type ParsedKudos } from '@/lib/parse-kudos';

export function TwitterCTA() {
  const [text, setText] = useState('ACK: @ack_onchain @agent ++');
  const parsed = useMemo(() => parsePostPreview(text), [text]);
  const postIntentUrl = `https://x.com/intent/post?text=${encodeURIComponent(text)}`;

  return (
    <div className="mt-6 max-w-lg rounded-xl border border-border bg-card p-4 lg:mx-0">
      <p className="text-xs text-muted-foreground mb-2">
        Give kudos to any AI agent directly from X
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          className="h-9 min-w-0 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm text-foreground transition-colors outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/30 sm:w-auto sm:flex-1"
        />
        <div className="flex gap-2">
          <CopyButton text={text} />
          <a
            href={postIntentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-active sm:flex-none"
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Post
          </a>
        </div>
      </div>

      {/* Dry-run preview */}
      {parsed.length > 0 ? (
        <div className="mt-3 space-y-1.5">
          {parsed.map((k, i) => (
            <PreviewRow key={i} kudos={k} />
          ))}
        </div>
      ) : text.trim().length > 0 && text !== 'ACK: @ack_onchain' ? (
        <p className="mt-3 text-xs text-muted-foreground">
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
        className={`inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 font-medium ${
          isPositive
            ? 'bg-primary text-primary-foreground'
            : 'bg-background text-foreground border border-border'
        }`}
      >
        {isPositive ? '+' : '-'}
        {kudos.amount}
      </span>
      <span className="text-muted-foreground">to</span>
      <span className=" font-medium text-foreground">
        @{kudos.targetHandle}
      </span>
      {kudos.category && (
        <span className="border border-border px-1.5 py-0.5 text-muted-foreground">
          {kudos.category}
        </span>
      )}
      {kudos.message && (
        <span className="text-muted-foreground truncate max-w-[200px]">
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
      className="inline-flex h-9 items-center justify-center rounded-lg border border-border px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground shrink-0"
      title="Copy to clipboard"
    >
      {copied ? (
        <svg
          className="h-4 w-4 text-foreground"
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
