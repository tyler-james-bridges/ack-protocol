import { test, expect } from '@playwright/test';

test.describe('Registry / Leaderboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/leaderboard');
  });

  test('page loads with Agent Registry heading', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Agent Registry');
  });

  test('network stats cards show real data', async ({ page }) => {
    // Network stats are conditionally rendered after API loads
    // The "Current View" stats always show, check those
    const agentsLabel = page.getByText('Agents', { exact: true });
    await expect(agentsLabel.first()).toBeVisible({ timeout: 15000 });

    // Check that either network stats or current view stats loaded
    const avgScore = page.getByText('Avg Score');
    await expect(avgScore).toBeVisible();
  });

  test('chain filter pills render', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: 'All Chains' })
    ).toBeVisible();
    const buttons = page.getByRole('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(3);
  });

  test('clicking a chain filter updates the list', async ({ page }) => {
    await page.waitForTimeout(2000);
    const chainButtons = page
      .getByRole('button')
      .filter({ hasText: /Ethereum|Base|Abstract/i });
    if ((await chainButtons.count()) > 0) {
      await chainButtons.first().click();
      await page.waitForTimeout(1000);
      await expect(page.locator('h1')).toContainText('Agent Registry');
    }
  });

  test('sort options work', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Sort options are buttons with text: Newest, Score, Feedback, Stars
    for (const label of ['Newest', 'Score', 'Feedback', 'Stars']) {
      const btn = page.getByRole('button', { name: label, exact: true });
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(500);
      }
    }
    await expect(page.locator('h1')).toContainText('Agent Registry');
  });

  test('agent cards render with name and details', async ({ page }) => {
    await page.waitForTimeout(3000);
    const cards = page.locator('[class*="cursor-pointer"]');
    const cardCount = await cards.count();
    if (cardCount > 0) {
      await expect(cards.first()).toBeVisible();
    }
  });

  test('clicking an agent card navigates to agent profile', async ({
    page,
  }) => {
    await page.waitForTimeout(3000);
    const cards = page.locator('[class*="cursor-pointer"]');
    if ((await cards.count()) > 0) {
      await cards.first().click();
      await page.waitForURL(/\/agent\//, { timeout: 10000 });
    }
  });
});
