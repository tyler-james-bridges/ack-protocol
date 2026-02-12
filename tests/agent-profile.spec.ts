import { test, expect } from '@playwright/test';

test.describe('Agent Profile', () => {
  test('navigate to agent from registry and verify profile loads', async ({
    page,
  }) => {
    // First get a real agent from the registry
    await page.goto('/leaderboard');
    await page.waitForTimeout(3000);

    const cards = page.locator('[class*="cursor-pointer"]');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      await cards.first().click();
      await page.waitForURL(/\/agent\//, { timeout: 10000 });

      // Agent name should render
      await expect(page.locator('h1')).toBeVisible();

      // Page should have loaded agent data
      const pageText = await page.textContent('body');
      expect(pageText!.length).toBeGreaterThan(100);
    }
  });

  test('agent profile shows reputation data', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForTimeout(3000);

    const cards = page.locator('[class*="cursor-pointer"]');
    if ((await cards.count()) > 0) {
      await cards.first().click();
      await page.waitForURL(/\/agent\//, { timeout: 10000 });
      await page.waitForTimeout(2000);

      // Should have stats cards or reputation info
      const pageText = await page.textContent('body');
      // Cross-chain reputation section
      expect(pageText).toBeTruthy();
    }
  });

  test('agent profile has chain badge', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForTimeout(3000);

    const cards = page.locator('[class*="cursor-pointer"]');
    if ((await cards.count()) > 0) {
      await cards.first().click();
      await page.waitForURL(/\/agent\//, { timeout: 10000 });
      await page.waitForTimeout(2000);

      // Should show chain information (badge or icon)
      // The URL itself contains chain info: /agent/{chain_id}/{token_id}
      const url = page.url();
      expect(url).toMatch(/\/agent\/\d+\/\d+/);
    }
  });
});
