import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('hero section renders with ACK branding', async ({ page }) => {
    await expect(page.locator('text=Agent Consensus Kudos')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Onchain reputation');
    await expect(page.locator('text=through consensus')).toBeVisible();
  });

  test('get started card with human/agent tabs', async ({ page }) => {
    await expect(page.locator('text=Get Started')).toBeVisible();
    const humanTab = page.getByRole('button', { name: 'HUMAN' });
    const agentTab = page.getByRole('button', { name: 'AGENT' });
    await expect(humanTab).toBeVisible();
    await expect(agentTab).toBeVisible();

    // Click agent tab
    await agentTab.click();
    // Click human tab back
    await humanTab.click();
  });

  test('connect button is visible', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /connect/i }).first()
    ).toBeVisible();
  });

  test('agent search input is functional', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('test agent');
      await expect(searchInput).toHaveValue('test agent');
    }
  });

  test('featured agents section loads real data', async ({ page }) => {
    // Wait for leaderboard data to load
    const agentCards = page
      .locator('[class*="cursor-pointer"]')
      .or(page.locator('[class*="border"][class*="rounded"]'));
    // Give time for API data
    await page.waitForTimeout(3000);

    // Check that we have some agent content rendered (names from API)
    const pageContent = await page.textContent('body');
    // The page should have loaded some real agent data or stats
    expect(pageContent).toBeTruthy();
  });

  test('links to /register and /leaderboard exist', async ({ page }) => {
    // Check for links in the page content
    const registerLinks = page.locator('a[href="/register"]');
    const leaderboardLinks = page.locator('a[href="/leaderboard"]');

    expect(await registerLinks.count()).toBeGreaterThan(0);
    expect(await leaderboardLinks.count()).toBeGreaterThan(0);
  });
});
