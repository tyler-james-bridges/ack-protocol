import { test, expect } from '@playwright/test';

const AGENTS = [
  { chain: 'abstract', tokenId: '606', label: 'Abstract' },
  { chain: 'base', tokenId: '19125', label: 'Base' },
  { chain: 'ethereum', tokenId: '26424', label: 'Ethereum' },
] as const;

const BASE_URL = 'https://8004scan.io';

test.describe('8004scan ACK Discovery', () => {
  test.describe.configure({ timeout: 60_000 });

  test('ACK appears in search results for all chains', async ({ page }) => {
    await page.goto(BASE_URL);

    // Type search query and submit
    const searchInput = page.getByPlaceholder(/search agents/i);
    await expect(searchInput).toBeVisible({ timeout: 15_000 });
    await searchInput.fill('ACK');
    await searchInput.press('Enter');

    // Should navigate to the registry page with search results
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    // Verify ACK agents appear in the results table for each chain
    for (const agent of AGENTS) {
      const agentRow = page.getByRole('row', {
        name: new RegExp(`ACK.*${agent.label}`, 'i'),
      });
      await expect(agentRow).toBeVisible({ timeout: 15_000 });
    }
  });

  for (const agent of AGENTS) {
    test(`ACK agent page loads on ${agent.label} (${agent.chain}/${agent.tokenId})`, async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/agents/${agent.chain}/${agent.tokenId}`);

      // Page title should contain ACK
      await expect(page).toHaveTitle(/ACK/i, { timeout: 15_000 });

      // Agent name should be visible on the page
      const agentName = page.getByText('ACK', { exact: true }).first();
      await expect(agentName).toBeVisible({ timeout: 15_000 });
    });
  }

  test('ACK is selectable from search results', async ({ page }) => {
    await page.goto(BASE_URL);

    // Search for ACK
    const searchInput = page.getByPlaceholder(/search agents/i);
    await expect(searchInput).toBeVisible({ timeout: 15_000 });
    await searchInput.fill('ACK');
    await searchInput.press('Enter');

    // Wait for results table
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    // Click the Abstract ACK agent (primary chain, #606)
    const ackLink = page.getByRole('link', { name: /ACK.*#606/i });
    await expect(ackLink).toBeVisible({ timeout: 15_000 });
    await ackLink.click();

    // Should navigate to the ACK agent page
    await expect(page).toHaveURL(/\/agents\/abstract\/606/, {
      timeout: 15_000,
    });
    await expect(page).toHaveTitle(/ACK/i);
  });
});
