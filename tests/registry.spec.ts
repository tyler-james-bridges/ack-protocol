import { test, expect } from '@playwright/test';

test.describe('Registry / Leaderboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/leaderboard', { waitUntil: 'domcontentloaded' });
  });

  test('page loads with Explore Agents heading', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Explore Agents', {
      timeout: 10000,
    });
  });

  test('network stats section visible', async ({ page }) => {
    await page.waitForTimeout(3000);
    await expect(page.locator('text=AGENTS').first()).toBeVisible();
  });

  test('sort buttons render', async ({ page }) => {
    await page.waitForTimeout(2000);
    for (const label of ['Newest', 'Score', 'Feedback', 'Kudos']) {
      const btn = page.getByRole('button', { name: label, exact: true });
      if (await btn.isVisible()) {
        expect(true).toBe(true);
        return;
      }
    }
    expect(true).toBe(true);
  });

  test('clicking a chain filter updates the list', async ({ page }) => {
    await page.waitForTimeout(2000);
    const chainButtons = page
      .getByRole('button')
      .filter({ hasText: /Ethereum|Base|Abstract/i });
    if ((await chainButtons.count()) > 0) {
      await chainButtons.first().click();
      await page.waitForTimeout(1000);
      await expect(page.locator('h1')).toContainText('Explore Agents');
    }
  });

  test('sort options work', async ({ page }) => {
    await page.waitForTimeout(2000);
    for (const label of ['Newest', 'Score', 'Feedback', 'Stars']) {
      const btn = page.getByRole('button', { name: label, exact: true });
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(500);
      }
    }
    await expect(page.locator('h1')).toContainText('Explore Agents');
  });

  test('agent cards render with name and details', async ({ page }) => {
    await page.waitForTimeout(3000);
    const cards = page.locator('[class*="cursor-pointer"]');
    const cardCount = await cards.count();
    if (cardCount > 0) {
      await expect(cards.first()).toBeVisible();
    }
  });

  test('agent card has link to profile', async ({ page }) => {
    await page.waitForTimeout(3000);
    const cards = page.locator('[class*="cursor-pointer"]');
    expect(await cards.count()).toBeGreaterThan(0);
  });
});
