import { type Page, test, expect } from '@playwright/test';

const AGENTS = [
  { chain: 'abstract', tokenId: '606', label: 'Abstract' },
  { chain: 'base', tokenId: '19125', label: 'Base' },
  { chain: 'ethereum', tokenId: '26424', label: 'Ethereum' },
] as const;

const BASE_URL = 'https://8004scan.io';

function agentPath(agent: (typeof AGENTS)[number]): string {
  return `/agents/${agent.chain}/${agent.tokenId}`;
}

function agentResultLink(page: Page, agent: (typeof AGENTS)[number]) {
  // Registry rows/cards both link to the agent; href is stable across layout churn.
  return page.locator(`a[href*="${agentPath(agent)}"]`).first();
}

/**
 * Open 8004scan's agent search results for "ACK".
 *
 * The homepage hero form is a React-controlled input named `search`. Playwright
 * fill() + Enter often submits `/agents?search=` (empty) before React state
 * catches up, so the registry shows "Newest" instead of ACK. The registry URL
 * is the same GET the form is supposed to produce.
 */
async function openAckSearchResults(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/agents?search=ACK`);
  await expect(page).toHaveURL(/search=ACK/i, { timeout: 15_000 });

  const searchInput = page.getByPlaceholder(/search/i).first();
  await expect(searchInput).toBeVisible({ timeout: 15_000 });
  await expect(searchInput).toHaveValue(/ACK/i, { timeout: 15_000 });
}

test.describe('8004scan ACK Discovery', () => {
  test.describe.configure({ timeout: 60_000 });

  test('ACK appears in search results for all chains', async ({ page }) => {
    await openAckSearchResults(page);

    for (const agent of AGENTS) {
      const agentLink = agentResultLink(page, agent);
      await expect(agentLink).toBeVisible({ timeout: 20_000 });
      await expect(agentLink).toContainText(/ACK/i);
    }
  });

  for (const agent of AGENTS) {
    test(`ACK agent page loads on ${agent.label} (${agent.chain}/${agent.tokenId})`, async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}${agentPath(agent)}`);

      // Page title should contain ACK
      await expect(page).toHaveTitle(/ACK/i, { timeout: 15_000 });

      // Agent name should be visible on the page
      const agentName = page.getByText('ACK', { exact: true }).first();
      await expect(agentName).toBeVisible({ timeout: 15_000 });
    });
  }

  test('ACK is selectable from search results', async ({ page }) => {
    await openAckSearchResults(page);

    const abstractAck = AGENTS[0];
    const ackLink = agentResultLink(page, abstractAck);
    await expect(ackLink).toBeVisible({ timeout: 15_000 });
    await ackLink.click();

    await expect(page).toHaveURL(/\/agents\/abstract\/606/, {
      timeout: 15_000,
    });
    await expect(page).toHaveTitle(/ACK/i);
  });
});
