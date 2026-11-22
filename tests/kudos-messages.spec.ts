import { expect, test } from '@playwright/test';

test('a public wallet shows the original kudos messages once', async ({
  page,
}) => {
  const address = '0x0000000000000000000000000000000000000001';
  const messages = [
    'Thanks for the review!',
    'Raw JSON feedback',
    '100% reliable, even on path %2F',
    'Gràcies 💚',
    'Good catch: 50% + #1?',
    '100% uptime',
  ];
  const feedbackURIs = [
    'data:,' + encodeURIComponent(JSON.stringify({ message: messages[0] })),
    JSON.stringify({ message: messages[1] }),
    'data:,' + JSON.stringify({ message: messages[2] }),
    'data:application/json;base64,' +
      Buffer.from(JSON.stringify({ reasoning: messages[3] })).toString(
        'base64'
      ),
    'data:,' + encodeURIComponent(messages[4]),
    'data:,' + messages[5],
    '',
    'data:,{}',
    'data:application/json;base64,!invalid!',
    'https://example.org/feedback',
  ];
  const events = feedbackURIs.map((feedbackURI, i) => ({
    feedbackURI,
    sender: address,
    agentId: 1,
    chainId: 2741,
    tag1: 'kudos',
    tag2: '',
    txHash: '0x' + String(i + 1).padStart(64, '0'),
    blockNumber: '123',
  }));
  await page.route('**/api/feedback?sender=*', (route) =>
    route.fulfill({ json: { events, total: events.length } })
  );
  await page.route('**/api/agents?*', (route) =>
    route.fulfill({ json: { items: [], total: 0 } })
  );
  await page.route('**/api/streaks/**', (route) =>
    route.fulfill({ json: null })
  );
  await page.route('**/api/tips/by-kudos', (route) =>
    route.fulfill({ json: { tips: {} } })
  );
  await page.route('**/api/timestamps?*', (route) =>
    route.fulfill({ json: {} })
  );
  await page.route('https://api.mainnet.abs.xyz/**', (route) => route.abort());
  await page.goto('/address/' + address);
  const feed = page.getByRole('heading', { name: 'Kudos Given' }).locator('..');
  await expect(feed.getByTitle('View transaction on Abscan')).toHaveCount(
    events.length
  );
  await expect(feed.getByText(/^“.*”$/)).toHaveText(
    messages.map((message) => '“' + message + '”')
  );
});
