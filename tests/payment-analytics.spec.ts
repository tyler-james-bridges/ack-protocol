import { expect, test } from '@playwright/test';
import type { BeforeSend, BeforeSendEvent } from '@vercel/analytics';

test('page views and custom events hide the tip URL before analytics sends them', async ({
  page,
}) => {
  const observe = page.waitForRequest((request) =>
    /\/insights\/script\.js|\/script\.debug\.js/.test(request.url())
  );
  await page.route(/\/insights\/|va\.vercel-scripts\.com/, (route) =>
    route.fulfill({ contentType: 'application/javascript', body: '' })
  );
  await page.goto('/docs');
  await observe;
  const actual = await page.evaluate(() => {
    const hook = window.vaq?.find(([name]) => name === 'beforeSend')?.[1] as
      | BeforeSend
      | undefined;
    const paths = [
      '/tip/private-id?wallet=private#receipt',
      '/tip/second-id/?code=private',
      '/docs?topic=wallet#heading',
      '/tips/stats?limit=10',
    ];
    return (['pageview', 'event'] as const).map((type) =>
      paths.map((path) => {
        const event: BeforeSendEvent = { type, url: location.origin + path };
        return hook ? hook(event)?.url : event.url;
      })
    );
  });
  const origin = new URL(page.url()).origin;
  const expected = [
    '/tip',
    '/tip',
    '/docs?topic=wallet#heading',
    '/tips/stats?limit=10',
  ].map((path) => origin + path);
  expect(actual).toEqual([expected, expected]);
});
