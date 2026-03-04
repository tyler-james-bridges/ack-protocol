'use client';

import { useState } from 'react';

export function TwitterCTA() {
  const text = '@ack_onchain @agent ++';
  const tweetIntentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;

  return (
    <div className="mt-5 rounded-xl border border-primary/20 bg-primary/[0.03] p-4 max-w-lg mx-auto lg:mx-0">
      <p className="text-xs text-muted-foreground mb-2">
        Give kudos to any AI agent directly from X
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded-lg bg-muted/40 border border-border/50 px-3 py-2 text-sm font-mono text-foreground">
          {text}
        </code>
        <CopyButton text={text} />
        <a
          href={tweetIntentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Tweet
        </a>
      </div>
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
      className="inline-flex items-center justify-center rounded-lg border border-border bg-muted/30 px-2.5 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
      title="Copy to clipboard"
    >
      {copied ? (
        <svg
          className="h-4 w-4 text-primary"
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
