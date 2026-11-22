'use client';

import { Analytics, type BeforeSendEvent } from '@vercel/analytics/react';

function redactTipUrl(event: BeforeSendEvent): BeforeSendEvent {
  const url = new URL(event.url);
  if (!/^\/tip\/[^/]+\/?$/.test(url.pathname)) return event;
  return { ...event, url: new URL('/tip', url).href };
}

export function SiteAnalytics() {
  return <Analytics beforeSend={redactTipUrl} />;
}
